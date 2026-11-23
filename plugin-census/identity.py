"""Conservative cross-registry identity index for the SG Plugin Census.

Source records are never merged or deleted. Cross-registry duplicate groups are
suggestions based only on an exact normalized repository URL and exact normalized
name; ordinary product/store URLs are not used as cross-registry evidence.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
from datetime import datetime, timezone
from urllib.parse import urlsplit, urlunsplit


REPOSITORY_HOSTS = {"github.com", "gitlab.com", "bitbucket.org"}
SCHEMA = """
CREATE TABLE IF NOT EXISTS canonical_identities (
    canonical_id TEXT PRIMARY KEY,
    ecosystem TEXT NOT NULL,
    source_item_id TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    canonical_url TEXT,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    UNIQUE(ecosystem, source_item_id)
);
CREATE TABLE IF NOT EXISTS duplicate_groups (
    group_id TEXT PRIMARY KEY,
    match_rule TEXT NOT NULL,
    evidence_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS duplicate_group_members (
    group_id TEXT NOT NULL REFERENCES duplicate_groups(group_id) ON DELETE CASCADE,
    canonical_id TEXT NOT NULL REFERENCES canonical_identities(canonical_id),
    PRIMARY KEY(group_id, canonical_id)
);
CREATE TABLE IF NOT EXISTS identity_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    source_records INTEGER NOT NULL,
    identity_records INTEGER NOT NULL,
    duplicate_groups INTEGER NOT NULL,
    mode TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_identity_name ON canonical_identities(normalized_name);
CREATE INDEX IF NOT EXISTS idx_identity_url ON canonical_identities(canonical_url);
CREATE INDEX IF NOT EXISTS idx_group_member_identity ON duplicate_group_members(canonical_id);
"""


def normalize_name(value: str) -> str:
    """Normalize whitespace/case only; preserve punctuation and token order."""
    return re.sub(r"\s+", " ", str(value or "").strip()).casefold()


def normalize_repository_url(value: str | None) -> str | None:
    """Return a conservative HTTPS repository locator, or None."""
    if not value or not isinstance(value, str):
        return None
    candidate = value.strip()
    if candidate.startswith("git@") and ":" in candidate:
        host_path = candidate[4:]
        host, path = host_path.split(":", 1)
        candidate = f"https://{host}/{path}"
    elif candidate.endswith(".git") and "://" not in candidate:
        candidate = "https://" + candidate
    try:
        parts = urlsplit(candidate)
        host = (parts.hostname or "").lower()
        if parts.scheme not in ("https", "http") or host not in REPOSITORY_HOSTS:
            return None
        path = re.sub(r"/+", "/", parts.path).strip("/")
        if path.lower().endswith(".git"):
            path = path[:-4]
        segments = [segment for segment in path.split("/") if segment]
        if len(segments) < 2:
            return None
        # GitHub/GitLab/Bitbucket repository roots have at least owner/project.
        normalized_path = "/" + "/".join(segments[:2]).casefold()
        return urlunsplit(("https", host, normalized_path, "", ""))
    except (ValueError, TypeError):
        return None


def source_identity(ecosystem: str, source_item_id: str) -> str:
    """Stable identity scoped to its source ecosystem; never cross-merges IDs."""
    key = f"{ecosystem.strip()}\0{str(source_item_id).strip()}"
    return "sgp_" + hashlib.sha256(key.encode("utf-8")).hexdigest()[:32]


def _group_id(canonical_ids: list[str]) -> str:
    payload = "\0".join(sorted(canonical_ids))
    return "sgd_" + hashlib.sha256(payload.encode("utf-8")).hexdigest()[:32]


def build_index(db_path: str, apply: bool = False) -> dict:
    """Build a dry-run report; persist only when apply=True."""
    mode = "apply" if apply else "dry-run"
    now = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(db_path) as db:
        db.row_factory = sqlite3.Row
        tables = {row["name"] for row in db.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )}
        if "harvested_items" not in tables:
            raise RuntimeError("harvested_items table is missing; run the census harvester first")
        rows = db.execute(
            "SELECT ecosystem, plugin_id, name, url, harvested_at "
            "FROM harvested_items ORDER BY ecosystem, plugin_id"
        ).fetchall()
        identities = []
        for row in rows:
            ecosystem, item_id = row["ecosystem"], row["plugin_id"]
            identities.append({
                "canonical_id": source_identity(ecosystem, item_id),
                "ecosystem": ecosystem,
                "source_item_id": item_id,
                "normalized_name": normalize_name(row["name"]),
                "canonical_url": normalize_repository_url(row["url"]),
                "harvested_at": row["harvested_at"],
            })

        # Candidate groups require the exact same repository root AND name.
        buckets: dict[tuple[str, str], list[dict]] = {}
        for item in identities:
            if item["canonical_url"] and item["normalized_name"]:
                key = (item["canonical_url"], item["normalized_name"])
                buckets.setdefault(key, []).append(item)
        groups = []
        for (repo_url, normalized_name), members in sorted(buckets.items()):
            ecosystems = {member["ecosystem"] for member in members}
            if len(members) < 2 or len(ecosystems) < 2:
                continue
            member_ids = sorted(member["canonical_id"] for member in members)
            groups.append({
                "group_id": _group_id(member_ids),
                "match_rule": "exact_repository_url_and_normalized_name",
                "evidence": {"repository_url": repo_url, "normalized_name": normalized_name},
                "members": member_ids,
            })

        report = {
            "mode": mode,
            "source_records": len(rows),
            "identity_records": len(identities),
            "duplicate_groups": len(groups),
            "cross_registry_matches_only": True,
            "source_records_modified": False,
            "groups": groups,
        }
        if not apply:
            return report

        db.executescript(SCHEMA)
        db.execute("PRAGMA foreign_keys=ON")
        db.execute(
            "INSERT INTO identity_runs(started_at,finished_at,source_records,identity_records,duplicate_groups,mode) "
            "VALUES(?,?,?,?,?,?)",
            (now, datetime.now(timezone.utc).isoformat(), len(rows), len(identities), len(groups), mode),
        )
        for item in identities:
            db.execute(
                """INSERT INTO canonical_identities
                   (canonical_id,ecosystem,source_item_id,normalized_name,canonical_url,first_seen_at,last_seen_at)
                   VALUES(?,?,?,?,?,?,?)
                   ON CONFLICT(ecosystem,source_item_id) DO UPDATE SET
                     normalized_name=excluded.normalized_name,
                     canonical_url=excluded.canonical_url,
                     last_seen_at=excluded.last_seen_at""",
                (item["canonical_id"], item["ecosystem"], item["source_item_id"],
                 item["normalized_name"], item["canonical_url"],
                 item["harvested_at"] or now, item["harvested_at"] or now),
            )
        # Rebuild only the derived grouping layer; preserve canonical identity rows and run history.
        db.execute("DELETE FROM duplicate_group_members")
        db.execute("DELETE FROM duplicate_groups")
        for group in groups:
            db.execute(
                "INSERT INTO duplicate_groups(group_id,match_rule,evidence_json,created_at) VALUES(?,?,?,?)",
                (group["group_id"], group["match_rule"],
                 json.dumps(group["evidence"], sort_keys=True), now),
            )
            db.executemany(
                "INSERT INTO duplicate_group_members(group_id,canonical_id) VALUES(?,?)",
                [(group["group_id"], canonical_id) for canonical_id in group["members"]],
            )
        db.commit()
        return report


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="SG cross-registry identity index")
    parser.add_argument("--db", default="census.db")
    parser.add_argument("--apply", action="store_true",
                        help="persist identity index; default is report-only")
    args = parser.parse_args(argv)
    report = build_index(args.db, apply=args.apply)
    print(json.dumps(report, indent=2, sort_keys=True))
    if not args.apply:
        print("Dry run only. Add --apply to persist the derived identity index.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
