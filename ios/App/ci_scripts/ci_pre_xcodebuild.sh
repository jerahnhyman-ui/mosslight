#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$SCRIPT_DIR/../../.." && pwd)}"

if [ ! -s "$REPOSITORY_ROOT/ios/App/App/public/index.html" ]; then
  echo "Bundled game assets are missing. The ci_post_clone.sh build must succeed before archiving." >&2
  exit 1
fi

if [ ! -s "$REPOSITORY_ROOT/ios/App/CapApp-SPM/Package.swift" ]; then
  echo "Capacitor's generated Swift package is missing. Check the cap sync ios step." >&2
  exit 1
fi
