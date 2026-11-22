# Huawei P30 Pro / Termux adapter

Role: secondary Android runtime and local inspection host.

Current state: adapter contract only; no Termux command, package installation, filesystem change, network connection or service activation has been performed.

Preflight must remain local and read-only. It may report Android/Termux environment metadata and availability of explicitly allowlisted tools without printing secrets or private file contents.

Execution policy:
- No root requirement.
- No public bind address; loopback only unless a separate network design is approved.
- No FTP/MCP endpoint exposure or firewall/network changes.
- No package installation or repository modification during preflight.
- Explicit task-scoped approval is required for every write or process execution.
