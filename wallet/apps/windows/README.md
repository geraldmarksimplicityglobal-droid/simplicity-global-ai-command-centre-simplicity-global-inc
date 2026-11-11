# Windows Codex client

Target: Windows 11 on HP 250 G10. This directory is a client integration specification, not an executable installer.

## Proposed layers

1. Shared wallet domain package and validation.
2. Windows presentation client for account metadata, portfolio views, and transaction previews.
3. Future Windows secure-storage adapter using a reviewed OS-backed credential/key facility.
4. Codex skill workflow for inspect-first development, tests, and evidence reporting.

## Constraints

- No local machine inspection, shell execution, package installation, credential access, service changes, firewall changes, or remote connection is performed by this specification.
- No secrets are written to source control or logs.
- No signing or broadcasting.
- The Windows client must not silently downgrade to plaintext key storage.
