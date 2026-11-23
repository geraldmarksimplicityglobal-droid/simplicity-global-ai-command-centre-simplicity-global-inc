"""CAMARA SIM Swap client and privacy-minimizing SQLite audit helpers."""
from __future__ import annotations
import hashlib, hmac, json, os, re, sqlite3, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timezone
from typing import Any

UA = "SimplicityGlobal-CAMARA-SIMSwap/1.0"
TIMEOUT = 20
MAX_RESPONSE_BYTES = 256_000
E164 = re.compile(r"^\+[1-9][0-9]{7,14}$")

class SimSwapError(RuntimeError):
    """Invalid input, configuration, or provider failure."""

def _validate_phone_number(phone_number: str) -> str:
    if not isinstance(phone_number, str) or not E164.fullmatch(phone_number):
        raise SimSwapError("phone_number must be a valid E.164 number")
    return phone_number

def _configuration(token: str | None, base_url: str | None) -> tuple[str, str]:
    bearer = token or os.environ.get("SIMSWAP_API_TOKEN")
    if not bearer or "\r" in bearer or "\n" in bearer:
        raise SimSwapError("SIMSWAP_API_TOKEN or an explicit token is required")
    base = (base_url or os.environ.get("SIMSWAP_API_BASE_URL") or "").rstrip("/")
    parsed = urllib.parse.urlsplit(base)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise SimSwapError("Set SIMSWAP_API_BASE_URL to the operator/aggregator's documented HTTPS API base URL")
    return bearer, base

def _post(operation: str, payload: dict[str, Any], token: str, base: str) -> dict[str, Any]:
    request = urllib.request.Request(
        f"{base}/{operation}", data=json.dumps(payload, separators=(",", ":")).encode("utf-8"),
        headers={"User-Agent": UA, "Authorization": f"Bearer {token}",
                 "Content-Type": "application/json", "Accept": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            raw = response.read(MAX_RESPONSE_BYTES + 1)
            if len(raw) > MAX_RESPONSE_BYTES:
                raise SimSwapError("Provider response exceeds the 256 KB safety limit")
            result = json.loads(raw.decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise SimSwapError(f"SIM Swap provider returned HTTP {exc.code}") from exc
    except (urllib.error.URLError, TimeoutError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise SimSwapError(f"SIM Swap request failed: {exc}") from exc
    if not isinstance(result, dict):
        raise SimSwapError("SIM Swap provider returned an unexpected response shape")
    return result

def check_sim_swap(phone_number: str, max_age_hours: int = 240, *,
                   token: str | None = None, base_url: str | None = None) -> dict[str, Any]:
    """Check whether a SIM swap occurred in the preceding 1–2400 hours."""
    number = _validate_phone_number(phone_number)
    if isinstance(max_age_hours, bool) or not isinstance(max_age_hours, int) or not 1 <= max_age_hours <= 2400:
        raise SimSwapError("max_age_hours must be an integer from 1 through 2400")
    bearer, base = _configuration(token, base_url)
    result = _post("check", {"phoneNumber": number, "maxAge": max_age_hours}, bearer, base)
    swapped = result.get("swapped")
    if not isinstance(swapped, bool):
        raise SimSwapError("Provider response is missing a boolean 'swapped' field")
    return {"phone_number": number, "max_age_hours": max_age_hours, "swapped": swapped,
            "queried_at": datetime.now(timezone.utc).isoformat(timespec="seconds")}

def retrieve_sim_swap_date(phone_number: str, *, token: str | None = None,
                           base_url: str | None = None) -> dict[str, Any]:
    """Retrieve the latest SIM-change timestamp, or None when not recorded."""
    number = _validate_phone_number(phone_number)
    bearer, base = _configuration(token, base_url)
    result = _post("retrieve-date", {"phoneNumber": number}, bearer, base)
    latest = result.get("latestSimChange")
    if latest is not None and not isinstance(latest, str):
        raise SimSwapError("Provider response has an invalid 'latestSimChange' value")
    return {"phone_number": number, "latest_sim_change": latest,
            "queried_at": datetime.now(timezone.utc).isoformat(timespec="seconds")}

def init_audit_db(connection: sqlite3.Connection) -> None:
    """Create an audit table storing a keyed number fingerprint, not the MSISDN."""
    connection.execute("""CREATE TABLE IF NOT EXISTS sim_swap_check (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_fingerprint TEXT NOT NULL,
        operation TEXT NOT NULL CHECK(operation IN ('check', 'retrieve-date')),
        max_age_hours INTEGER,
        swapped INTEGER CHECK(swapped IN (0, 1) OR swapped IS NULL),
        latest_change TEXT,
        queried_at TEXT NOT NULL,
        provider_status TEXT NOT NULL DEFAULT 'success')""")

def persist_check(connection: sqlite3.Connection, result: dict[str, Any], *,
                  operation: str = "check", audit_key: str | None = None) -> None:
    """Persist minimal audit metadata; an explicit high-entropy HMAC key is required."""
    if operation not in ("check", "retrieve-date"):
        raise SimSwapError("Unsupported SIM Swap audit operation")
    key = audit_key or os.environ.get("SIMSWAP_AUDIT_HMAC_KEY")
    if not key or len(key) < 32:
        raise SimSwapError("SIMSWAP_AUDIT_HMAC_KEY must contain at least 32 characters")
    number = _validate_phone_number(result.get("phone_number"))
    fingerprint = hmac.new(key.encode("utf-8"), number.encode("ascii"), hashlib.sha256).hexdigest()
    swapped = result.get("swapped")
    if swapped is not None and not isinstance(swapped, bool):
        raise SimSwapError("Audit result 'swapped' must be boolean or None")
    connection.execute("""INSERT INTO sim_swap_check
        (phone_fingerprint, operation, max_age_hours, swapped, latest_change, queried_at)
        VALUES (?, ?, ?, ?, ?, ?)""",
        (fingerprint, operation, result.get("max_age_hours"),
         None if swapped is None else int(swapped), result.get("latest_sim_change"),
         result["queried_at"]))
    connection.commit()
