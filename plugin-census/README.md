# SG Plugin Census / Harvesting

Separate opt-in Python subsystem. It distinguishes plugin marketplaces from telecom product catalogs, seller-scoped commerce APIs and merchant transaction APIs.

- Registry: 31 records (4 South African platforms + 27 additional ecosystems).
- Access posture: `live`, `token`, or `manual`; verification metadata separately records whether the endpoint is confirmed.
- Implemented public adapters: ShopGlu (single WordPress.org lookup), n8n (GitHub node directories), Node-RED (npm keyword search).
- Vodacom, Takealot and PayJustNow credentialed templates fail closed because the supplied exact read endpoints are unverified.
- Telkom and web-only directories remain catalog/manual.

## Run
Python 3.10+, standard library only.
```bash
cd plugin-census
python -m unittest -v
python harvest.py --db census.db --only shopglu n8n nodered
python harvest.py --db census.db --only shopglu n8n nodered --execute
```

Set `GITHUB_TOKEN` in the process environment to reduce unauthenticated GitHub rate-limit pressure. Do not place credentials in source files or URLs.

Recognized credential variable names: `VODACOM_API_TOKEN`, `TAKEALOT_API_KEY`, `PAYJUSTNOW_MERCHANT_ID`, `PAYJUSTNOW_SECRET_KEY`. Supplying them does not enable unverified endpoints.

SQLite stores normalized records and a harvest-run audit trail. Counts in the registry are supplied historical estimates, not live totals. The second supplied list contains 27 entries, despite its introductory claim of 24.

## CAMARA SIM Swap service

The operational SIM Swap client is isolated under services/simswap.py and is not
registered as a catalog harvester. See SIMSWAP.md for the two POST operations,
configuration, privacy controls and usage. It requires an operator/aggregator
documented HTTPS base URL in SIMSWAP_API_BASE_URL and a bearer token in
SIMSWAP_API_TOKEN. The example GSMA sandbox URL is intentionally not assumed
to be a verified endpoint. The offline test suite mocks HTTP and does not query
real MSISDNs or contact a provider. Optional audit persistence uses an HMAC
fingerprint rather than storing the telephone number.
