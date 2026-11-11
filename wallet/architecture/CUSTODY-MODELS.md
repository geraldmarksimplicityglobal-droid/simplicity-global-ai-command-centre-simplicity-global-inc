# Custody model separation

## Self-custody bounded context

- Keys remain under the user's direct control.
- Future key operations must use audited libraries and OS-backed secure storage or an explicitly reviewed hardware signer.
- Android and Windows storage implementations are platform-specific; no plaintext fallback is permitted.
- Recovery design must be documented and threat-modelled before implementation.
- The app must not transmit seed phrases, private keys, or recovery material.

## Custodial bounded context

- Separate backend service and deployment boundary.
- Dedicated key-management design using an appropriately reviewed HSM/KMS architecture.
- Least-privilege service identities, dual control for sensitive operations, immutable audit trails, monitored access, incident response, backups, and tested recovery.
- Jurisdiction-specific legal, regulatory, AML/KYC, privacy, and consumer-protection review before launch.
- Customer support and account recovery must not expose signing secrets to staff.

## Shared controls

- Custodial and self-custody accounts must never share key storage or signing code paths.
- UI must identify custody mode clearly for each account.
- A custody-mode migration is not an ordinary setting change; it requires a separately designed and approved transfer workflow.
- The present stage implements neither key storage nor signing.
