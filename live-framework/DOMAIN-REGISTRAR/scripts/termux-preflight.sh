#!/data/data/com.termux/files/usr/bin/sh
# Read-only Termux preflight. Does not install, modify, connect, or execute project code.
set -eu
printf '%s\n' 'SG-DOM-001 Termux preflight (read-only)'
printf 'Kernel: '; uname -srm
printf 'Prefix: %s\n' "${PREFIX:-not-set}"
for name in git node npm python; do
  if command -v "$name" >/dev/null 2>&1; then
    printf '%s: available at %s\n' "$name" "$(command -v "$name")"
  else
    printf '%s: not found on PATH\n' "$name"
  fi
done
printf '%s\n' 'No environment variables, credentials, files, services, firewall rules, or network endpoints were inspected.'
