#!/usr/bin/env bash
# Runs a command (normally electron-builder) with a .p12 signing certificate
# loaded into a temporary keychain, exposed through CSC_KEYCHAIN.
#
# electron-builder 26 can import a .p12 itself via CSC_LINK, but it unlocks the
# keychain with the certificate password instead of the keychain password, so
# `security set-key-partition-list` fails. Preparing the keychain here avoids it.
#
# Usage: P12_PASSWORD=... scripts/macos-with-signing-keychain.sh <cert.p12> -- <command...>
# Written for the macOS system bash (3.2).
set -euo pipefail

if [[ $# -lt 3 || "$2" != "--" ]]; then
  echo "Usage: P12_PASSWORD=... $0 <cert.p12> -- <command...>" >&2
  exit 2
fi
P12="$1"
shift 2
: "${P12_PASSWORD:?P12_PASSWORD must be set}"

WORK="$(mktemp -d)"
KEYCHAIN="$WORK/ghost-runner-signing.keychain-db"
KEYCHAIN_PASSWORD="$(/usr/bin/openssl rand -hex 24)"

ORIGINAL_KEYCHAINS=()
while IFS= read -r line; do
  line="${line#"${line%%[![:space:]]*}"}"
  line="${line#\"}"
  line="${line%\"}"
  if [[ -n "$line" ]]; then ORIGINAL_KEYCHAINS+=("$line"); fi
done < <(security list-keychains -d user)

cleanup() {
  security list-keychains -d user -s ${ORIGINAL_KEYCHAINS[@]+"${ORIGINAL_KEYCHAINS[@]}"} || true
  security delete-keychain "$KEYCHAIN" 2>/dev/null || true
  rm -rf "$WORK"
}
trap cleanup EXIT

security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
security set-keychain-settings -lut 21600 "$KEYCHAIN"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
security import "$P12" -k "$KEYCHAIN" -P "$P12_PASSWORD" \
  -T /usr/bin/codesign -T /usr/bin/productbuild >/dev/null
# Lets codesign use the key without a GUI prompt.
security set-key-partition-list -S apple-tool:,apple: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN" >/dev/null
# codesign ignores --keychain unless the keychain is also in the search list.
security list-keychains -d user -s "$KEYCHAIN" ${ORIGINAL_KEYCHAINS[@]+"${ORIGINAL_KEYCHAINS[@]}"}

unset CSC_LINK CSC_KEY_PASSWORD
CSC_KEYCHAIN="$KEYCHAIN" "$@"
