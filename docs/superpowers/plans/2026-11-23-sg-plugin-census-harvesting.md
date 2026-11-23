# SG Plugin Census Implementation Plan

- [x] Inspect the active SG Codex feature branch and confirm no existing harvesting package is present.
- [x] Add 31 registry records (4 South African + 27 additional ecosystems).
- [x] Add normalized SQLite persistence and harvest-run audit records.
- [x] Add opt-in public adapters for ShopGlu, n8n and Node-RED.
- [x] Add fail-closed token templates for Vodacom, Takealot and PayJustNow.
- [x] Keep Telkom and web-only directories catalog/manual.
- [x] Add HTTPS host allowlisting, response size limit, bounded pagination and dry-run default.
- [x] Add offline unit tests; no live credentials or endpoints are exercised.
- [ ] Validate vendor-specific authenticated endpoints against account-owner documentation and approval.
- [ ] Run a separately approved live harvest.
