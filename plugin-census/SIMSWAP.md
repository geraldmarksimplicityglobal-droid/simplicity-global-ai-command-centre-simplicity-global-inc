# CAMARA SIM Swap service

This is an operational telecom API client, not a marketplace harvester. It is separate from harvest.py and the harvested_items table.

## Operations
- check_sim_swap(phone_number, max_age_hours=240) calls POST /check with phoneNumber and maxAge (integer 1–2400).
- retrieve_sim_swap_date(phone_number) calls POST /retrieve-date with phoneNumber.

Both old and new MSISDNs use the same operation. The API reports whether a swap has already occurred; it does not perform a SIM change or identify an old/new-number relationship.

## Configuration
- SIMSWAP_API_TOKEN: bearer token.
- SIMSWAP_API_BASE_URL: operator/aggregator HTTPS API base URL from current provider documentation.
- SIMSWAP_AUDIT_HMAC_KEY: optional audit key, at least 32 characters, when audit persistence is used.

The sample GSMA sandbox hostname/path in project notes is not embedded as a default: the exact host, routes, authorization flow and availability must be verified against the selected provider's current documentation. The CAMARA specification does not itself provision a production endpoint.

## Example
Import check_sim_swap and retrieve_sim_swap_date from services.simswap, then call them with an E.164 MSISDN.

Set credentials in the process environment or a secret manager; never commit credentials. Tests mock HTTP and do not contact a provider.

## Privacy and audit
persist_check records a keyed HMAC fingerprint of the MSISDN rather than the number, alongside the operation, look-back period, result and timestamp. Protect the audit database and HMAC key as sensitive operational data.

A successful implementation test does not prove that a configured endpoint is reachable or that an operator has provisioned SIM Swap access.
