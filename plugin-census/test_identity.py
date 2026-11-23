import os
import sqlite3
import tempfile
import unittest

import identity


class IdentityIndexTests(unittest.TestCase):
    def setUp(self):
        handle, self.path = tempfile.mkstemp(suffix=".db")
        os.close(handle)
        with sqlite3.connect(self.path) as db:
            db.execute("""CREATE TABLE harvested_items (
                ecosystem TEXT NOT NULL, plugin_id TEXT NOT NULL, name TEXT NOT NULL,
                author TEXT, version TEXT, downloads INTEGER, rating REAL,
                category TEXT, updated_at TEXT, url TEXT, raw_json TEXT NOT NULL,
                harvested_at TEXT NOT NULL, PRIMARY KEY(ecosystem,plugin_id))""")
            rows = [
                ("openvsx", "acme.tool", "Acme Tool", "https://github.com/acme/tool"),
                ("sublime-package-control", "tool", "Acme Tool",
                 "https://github.com/acme/tool.git"),
                ("pypi-simple", "acme-tool", "Acme Tool",
                 "https://pypi.org/project/acme-tool/"),
                ("mcp-official", "acme/tool", "Acme Tool",
                 "https://gitlab.com/acme/tool"),
                ("melpa", "tool", "Different Name",
                 "https://github.com/acme/tool"),
            ]
            for ecosystem, plugin_id, name, url in rows:
                db.execute(
                    "INSERT INTO harvested_items(ecosystem,plugin_id,name,url,raw_json,harvested_at) "
                    "VALUES(?,?,?,?,?,?)",
                    (ecosystem, plugin_id, name, url, "{}", "2026-11-23T00:00:00+00:00"),
                )

    def tearDown(self):
        os.unlink(self.path)

    def test_normalization_is_conservative(self):
        self.assertEqual(identity.normalize_name("  ACME   Tool "), "acme tool")
        self.assertEqual(identity.normalize_repository_url(
            "git@github.com:Acme/Tool.git"), "https://github.com/acme/tool")
        self.assertIsNone(identity.normalize_repository_url(
            "https://pypi.org/project/acme-tool/"))

    def test_identity_is_stable_and_ecosystem_scoped(self):
        a = identity.source_identity("openvsx", "same-id")
        self.assertEqual(a, identity.source_identity("openvsx", "same-id"))
        self.assertNotEqual(a, identity.source_identity("melpa", "same-id"))

    def test_dry_run_does_not_write_identity_tables(self):
        report = identity.build_index(self.path)
        self.assertEqual(report["source_records"], 5)
        self.assertEqual(report["identity_records"], 5)
        self.assertEqual(report["duplicate_groups"], 1)
        with sqlite3.connect(self.path) as db:
            tables = {row[0] for row in db.execute(
                "SELECT name FROM sqlite_master WHERE type='table'")}
        self.assertNotIn("canonical_identities", tables)
        self.assertEqual(report["source_records_modified"], False)

    def test_apply_persists_derived_index_without_changing_source_rows(self):
        before = sqlite3.connect(self.path).execute(
            "SELECT ecosystem,plugin_id,name,url FROM harvested_items ORDER BY ecosystem,plugin_id"
        ).fetchall()
        report = identity.build_index(self.path, apply=True)
        self.assertEqual(report["duplicate_groups"], 1)
        with sqlite3.connect(self.path) as db:
            after = db.execute(
                "SELECT ecosystem,plugin_id,name,url FROM harvested_items ORDER BY ecosystem,plugin_id"
            ).fetchall()
            self.assertEqual(before, after)
            self.assertEqual(db.execute("SELECT COUNT(*) FROM canonical_identities").fetchone()[0], 5)
            self.assertEqual(db.execute("SELECT COUNT(*) FROM duplicate_groups").fetchone()[0], 1)
            self.assertEqual(db.execute("SELECT COUNT(*) FROM duplicate_group_members").fetchone()[0], 2)
            self.assertEqual(db.execute("SELECT COUNT(*) FROM identity_runs").fetchone()[0], 1)

    def test_rebuild_keeps_canonical_ids_stable(self):
        identity.build_index(self.path, apply=True)
        with sqlite3.connect(self.path) as db:
            first = db.execute(
                "SELECT canonical_id FROM canonical_identities WHERE ecosystem='openvsx'"
            ).fetchone()[0]
        identity.build_index(self.path, apply=True)
        with sqlite3.connect(self.path) as db:
            second = db.execute(
                "SELECT canonical_id FROM canonical_identities WHERE ecosystem='openvsx'"
            ).fetchone()[0]
            self.assertEqual(first, second)
            self.assertEqual(db.execute("SELECT COUNT(*) FROM identity_runs").fetchone()[0], 2)


if __name__ == "__main__":
    unittest.main()
