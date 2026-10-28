#!/bin/bash
# Xcode Cloud runs this after checking out the repository and before resolving SPM.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$SCRIPT_DIR/../../.." && pwd)}"
cd "$REPOSITORY_ROOT"

# Capacitor 8 requires Node 22+. Choose one LTS major for reproducible CI installs.
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" != "22" ]; then
  if ! command -v brew >/dev/null 2>&1; then
    echo "Node 22 LTS or Homebrew is required on the build machine." >&2
    exit 1
  fi
  export HOMEBREW_NO_AUTO_UPDATE=1
  brew list node@22 >/dev/null 2>&1 || brew install node@22
  export PATH="$(brew --prefix node@22)/bin:$PATH"
fi

echo "Building Mosslight web assets with Node $(node --version)."
npm ci --no-audit --no-fund
npm test
npm run build
npx --no-install cap sync ios
npm run ios:check

test -s ios/App/App/public/index.html
echo "Web assets and the generated Capacitor Swift package are ready for Xcode."
