# Security boundaries

- No real funds or production custody in this stage.
- No private-key or seed-phrase generation, import, display, export, or storage implemented.
- No signing or broadcasting interfaces exposed by the initial core.
- No live RPC, WalletConnect, exchange, or hardware-wallet connections.
- Mock fixtures are synthetic and must never be represented as real balances.
- Never log sensitive material. Redact addresses where privacy policy requires.
- Future key storage must use OS-backed secure storage or a reviewed hardware signer, with explicit threat modeling.
- Custodial wallet support requires isolated backend infrastructure, access controls, audit trails, recovery policy, incident response, and jurisdiction-specific legal review.
