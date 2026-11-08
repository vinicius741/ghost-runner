#!/usr/bin/env bash
# Creates the self-signed code-signing certificate that every macOS build of
# Ghost Runner must be signed with for in-place automatic updates to work.
#
# macOS only installs an update whose signature matches the installed app's
# certificate. Run this ONCE, keep the output folder safe, and reuse it for
# every build (locally and in GitHub Actions). Creating a new certificate
# means installed apps can no longer update until reinstalled by hand.
#
# Usage: scripts/macos-create-signing-cert.sh [output-dir]
# Default output dir: ~/.ghost-runner-signing
set -euo pipefail

NAME="Ghost Runner Self-Signed"
OUT_DIR="${1:-$HOME/.ghost-runner-signing}"
P12="$OUT_DIR/ghost-runner-signing.p12"
PASSWORD_FILE="$OUT_DIR/ghost-runner-signing.password"
CERT_PEM="$OUT_DIR/ghost-runner-signing.cert.pem"
# LibreSSL writes PKCS#12 files that the macOS `security` tool can import;
# OpenSSL 3 defaults (Homebrew) produce files it rejects.
OPENSSL=/usr/bin/openssl

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script must run on macOS." >&2
  exit 1
fi

trust_certificate() {
  if security verify-cert -q -c "$CERT_PEM" -p codeSign >/dev/null 2>&1; then
    echo "The certificate is already trusted for code signing on this Mac."
    return
  fi
  echo "Trusting the certificate for code signing (macOS will ask for your password)..."
  # Trust lets electron-builder find the identity. It only affects code signing
  # on this Mac; it does not make the certificate trusted for websites or email.
  security add-trusted-cert -r trustRoot -p codeSign \
    -k "$HOME/Library/Keychains/login.keychain-db" "$CERT_PEM"
}

if [[ -e "$P12" ]]; then
  echo "A signing certificate already exists at $P12."
  echo "Reusing it. Replacing it would stop installed apps from updating."
  trust_certificate
  exit 0
fi

umask 077
mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

cat > "$WORK/cert.cnf" <<EOF
[req]
distinguished_name = dn
x509_extensions = ext
prompt = no
[dn]
CN = $NAME
[ext]
basicConstraints = critical, CA:false
keyUsage = critical, digitalSignature
extendedKeyUsage = critical, codeSigning
subjectKeyIdentifier = hash
EOF

# 20-year validity: builds are not timestamped by a trusted authority, so an
# expired certificate would invalidate the signature of the installed app.
"$OPENSSL" req -x509 -newkey rsa:2048 -sha256 -days 7300 -nodes \
  -keyout "$WORK/key.pem" -out "$CERT_PEM" -config "$WORK/cert.cnf"

"$OPENSSL" rand -hex 24 > "$PASSWORD_FILE"
P12_PASSWORD="$(cat "$PASSWORD_FILE")" "$OPENSSL" pkcs12 -export \
  -inkey "$WORK/key.pem" -in "$CERT_PEM" -name "$NAME" \
  -out "$P12" -passout env:P12_PASSWORD

echo
trust_certificate

echo
echo "Created $P12"
echo "Back up $OUT_DIR somewhere safe. Losing it means a manual reinstall later."
echo
echo "To let GitHub Actions sign macOS releases with it, run from the repo:"
echo "  base64 -i \"$P12\" | gh secret set MAC_CSC_LINK"
echo "  gh secret set MAC_CSC_KEY_PASSWORD < \"$PASSWORD_FILE\""
