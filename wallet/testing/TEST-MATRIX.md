# Wallet test matrix

All tests must run offline with deterministic synthetic fixtures.

| Area | Test cases | Required result |
|---|---|---|
| Network registry | Unknown ID, wrong family, wrong chain ID, mainnet/testnet mismatch | Reject |
| Account metadata | Missing IDs, duplicate IDs, malformed addresses | Reject or isolate |
| Balances | Negative values, invalid base-unit strings, decimal overflow | Reject |
| Transaction intent | Empty fields, zero/negative/non-integer amount, wrong network | Reject |
| Preview | Mock fee, warning display, repeated request | Deterministic; no side effects |
| Custody separation | Cross-context key access | Impossible by interface and policy |
| Secret hygiene | Logs, errors, telemetry, fixtures | No secrets present |
| Replay/idempotency | Duplicate operation identifiers | Duplicate safely rejected |
| Failure paths | Adapter timeout/error/malformed response | Fail closed |
| Platform storage | Secure storage unavailable | Block key operation; never plaintext fallback |

## Explicitly out of scope

Live RPC tests, mainnet tests, signing, broadcasting, key import/export, real wallet recovery, production custody, and real-fund flows.
