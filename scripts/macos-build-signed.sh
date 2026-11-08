#!/usr/bin/env bash
# Builds the macOS app signed with the self-signed Ghost Runner certificate
# (see scripts/macos-create-signing-cert.sh) so it can update itself.
#
# Usage: scripts/macos-build-signed.sh [extra electron-builder args]
# Env:   GHOST_RUNNER_SIGNING_DIR (default ~/.ghost-runner-signing)
set -euo pipefail

SIGNING_DIR="${GHOST_RUNNER_SIGNING_DIR:-$HOME/.ghost-runner-signing}"
P12="$SIGNING_DIR/ghost-runner-signing.p12"
PASSWORD_FILE="$SIGNING_DIR/ghost-runner-signing.password"

if [[ ! -f "$P12" || ! -f "$PASSWORD_FILE" ]]; then
  echo "No signing certificate in $SIGNING_DIR. Run scripts/macos-create-signing-cert.sh first." >&2
  exit 1
fi

cd "$(dirname "$0")/.."
pnpm run build:frontend:verified
pnpm run build:server
pnpm run build:electron

# Apple notarization needs a paid Developer ID, so it is turned off here.
P12_PASSWORD="$(cat "$PASSWORD_FILE")" scripts/macos-with-signing-keychain.sh "$P12" -- \
  pnpm exec electron-builder --mac --publish never \
  --config.mac.forceCodeSigning=true --config.mac.notarize=false "$@"
