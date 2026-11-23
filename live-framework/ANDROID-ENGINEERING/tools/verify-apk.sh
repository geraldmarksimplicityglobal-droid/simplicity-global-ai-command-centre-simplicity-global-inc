#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 path/to/application.apk" >&2
  exit 2
fi

APK_PATH="$1"
if [[ ! -f "$APK_PATH" ]]; then
  echo "APK not found: $APK_PATH" >&2
  exit 2
fi

command -v apksigner >/dev/null 2>&1 || {
  echo "apksigner is not on PATH. Install Android SDK Build Tools." >&2
  exit 127
}

apksigner verify --verbose --print-certs "$APK_PATH"
