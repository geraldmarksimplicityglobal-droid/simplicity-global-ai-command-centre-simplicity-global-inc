# SG Plugin Census / Harvesting

Separate opt-in Python subsystem. It distinguishes plugin marketplaces from telecom product catalogs, seller-scoped commerce APIs and merchant transaction APIs.

- Registry: 38 records (36 prior entries plus Factorio Mod Portal and Steam Workshop).
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

## Xbox and PlayStation surfaces

The registry distinguishes game catalogs, SDK distributions and partner-scoped
APIs; these are not represented as one generic plug-in marketplace.

- `xbox-gamepass`: public Microsoft Store catalog adapter, queried by market
  and platform. It produces game-catalog records, not GDK/XSAPI extensions.
- `xbox-partner`: token/partner-scoped registry entry only; no global catalog
  adapter is provided.
- `xbox-xsapi`: manual SDK source entry; SDK artifacts are not a browsable
  marketplace catalog.
- `psn-store`: unofficial PlayStation Store Chihiro adapter. It only fetches
  explicitly supplied seed container IDs (default seed retained from the
  supplied project notes); it does not claim full-store discovery.
- `psn-partners`: OAuth/partner-scoped entry only; no partner credentials are
  requested and no seller sales data is queried.

Dry-run:
```bash
python harvest.py --db census.db --only xbox-gamepass psn-store
```

Execute explicitly:
```bash
python harvest.py --db census.db --only xbox-gamepass psn-store --execute
```

The adapters use the fixed HTTPS hosts in the harvester allowlist. The
PlayStation endpoint is unofficial and may change. Microsoft Store catalog
results may include products beyond Game Pass entitlement; returned records
must not be interpreted as confirmed Game Pass availability without an
entitlement-aware source. Both adapters are opt-in network operations and
offline tests mock all HTTP responses.

## Factorio and Steam Workshop

- `factorio`: public, unauthenticated Factorio Mod Portal JSON listing. The adapter follows the API's pagination envelope, normalizes mod owner, latest release, downloads and score, and stops on the advertised final page or an empty/short final page when page-count metadata is absent.
- `steam-workshop`: publisher-key-gated discovery entry. The public GetPublishedFileDetails operation can retrieve metadata for known published-file IDs, but does not discover the catalogue. It remains catalog-only until the QueryFiles request method, required parameters, response envelope and publisher-key handling are verified. No Steam key is requested or embedded.

Factorio dry-run:
```bash
python harvest.py --db census.db --only factorio
``

Factorio network execution is opt-in:
```bash
python harvest.py --db census.db --only factorio --execute
``

Steam Workshop is intentionally excluded from unauthenticated harvesting. Its classification describes the discovery credential requirement, not the per-ID metadata endpoint.
