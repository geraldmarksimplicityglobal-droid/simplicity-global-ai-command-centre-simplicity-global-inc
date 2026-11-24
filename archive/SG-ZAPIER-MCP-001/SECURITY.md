# Security and operational controls

- No API keys, bearer tokens, cookies, OAuth refresh tokens, or account identifiers are committed.
- Read operations are isolated behind an injected adapter.
- Default policy denies live writes, overwrite, delete, and production activation.
- Reviewer approval and execution authorization are separate state transitions.
- High-risk approval requires distinct reviewer and executor identities.
- First release creates a copy only; it never mutates or deletes the source Zap.
- Production must persist audit events to an append-only store and redact sensitive payloads.
- Do not send email, create/update CRM contacts, post Slack messages, or trigger financial actions during tests. Use mocked adapters or a dedicated sandbox.
