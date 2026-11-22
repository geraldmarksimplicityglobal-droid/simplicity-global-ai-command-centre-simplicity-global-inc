# HP Windows 11 / Codex adapter

Role: primary development and operator workstation.

Current state: adapter contract only; no local inspection, installation, process launch, credential access, service change or deployment has been performed.

Preflight is read-only. It may report OS version and whether approved executables are discoverable. It must not print environment variables, tokens, registry secrets or credential-store contents.

Execution policy:
- Repository and working directory must be explicitly selected.
- Default operations are read-only.
- Every command requires a task ID, exact executable, argument array, working-directory boundary, timeout and approval record.
- Shell interpolation, arbitrary PowerShell strings and implicit elevation are prohibited.
- No service installation, firewall change, scheduled task, startup persistence or network listener by default.
- User must review each proposed command before execution.
