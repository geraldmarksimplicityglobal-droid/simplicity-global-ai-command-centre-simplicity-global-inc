# Security and operational controls

- Never commit API keys, bearer tokens, cookies, OAuth refresh tokens, or user credentials.
- Complete OAuth through the supported VS Code/Zapier sign-in flow.
- Use a fixed, least-privilege tool set; begin with read-only capabilities.
- Unknown or unavailable tools are unsupported and must fail closed.
- Live writes are disabled by default.
- Reviewer approval and execution authorization are separate, digest-bound steps.
- The reviewer and executor must be distinct actors under the default policy.
- The first release supports copy-only execution; no source overwrite, delete, or production activation.
- Tests use mocked adapters and must not send messages, update CRM data, trigger payments, or execute production workflows.
- Production requires durable append-only audit storage, verified actor identity, sandbox tests, and a separate production release authorization.
