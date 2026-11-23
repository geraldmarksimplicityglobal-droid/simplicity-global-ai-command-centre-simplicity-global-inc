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
