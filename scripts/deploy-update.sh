#!/usr/bin/env bash
# =============================================================================
# deploy-update.sh — Script de publication d'une mise à jour Studeo
# =============================================================================
#
# Usage :
#   ./deploy-update.sh 3.3.0
#
# Ce script :
#   1. Met à jour les versions dans tauri.conf.json + Cargo.toml + version.json
#   2. Build l'application Tauri (macOS .app.tar.gz)
#   3. Signe le bundle avec la clé privée
#   4. Met à jour releases/latest.json avec la signature
#   5. Commit + push automatique vers GitHub
#
# Prérequis :
#   - Rust + Cargo installés (rustup)
#   - TAURI_PRIVATE_KEY défini dans l'environnement (ou chemin vers la clé)
#   - gh CLI authentifié
# =============================================================================

set -euo pipefail

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  echo "❌ Usage: $0 <version> (ex: 3.3.0)"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
TAURI_CONF="$ROOT_DIR/src-tauri/tauri.conf.json"
CARGO_TOML="$ROOT_DIR/src-tauri/Cargo.toml"
VERSION_JSON="$ROOT_DIR/public/version.json"
LATEST_JSON="$ROOT_DIR/releases/latest.json"

# ── Variables de signature ─────────────────────────────────────────────────
export TAURI_PRIVATE_KEY="${TAURI_PRIVATE_KEY:-$HOME/.tauri/studeo.key}"
export TAURI_KEY_PASSWORD="${TAURI_KEY_PASSWORD:-}"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  📦 STUDEO DEPLOY v$VERSION"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 1. Mise à jour des versions ───────────────────────────────────────────
echo "📝 [1/5] Mise à jour des versions..."

# tauri.conf.json
sed -i '' "s/\"version\": \"[0-9]*\.[0-9]*\.[0-9]*\"/\"version\": \"$VERSION\"/" "$TAURI_CONF"

# Cargo.toml (package version)
sed -i '' "0,/^version = \"[0-9]*\.[0-9]*\.[0-9]*\"/s//version = \"$VERSION\"/" "$CARGO_TOML"

# public/version.json
cat > "$VERSION_JSON" <<EOF
{
  "version": "$VERSION"
}
EOF

echo "   ✅ Versions mises à jour → v$VERSION"

# ── 2. Build Vite ─────────────────────────────────────────────────────────
echo ""
echo "🏗️  [2/5] Build Vite (frontend)..."
npm run build
echo "   ✅ Frontend buildé"

# ── 3. Build Tauri ────────────────────────────────────────────────────────
echo ""
echo "🦀 [3/5] Build Tauri (desktop app)..."
npx tauri build
echo "   ✅ Application buildée"

# ── 4. Récupération de la signature ───────────────────────────────────────
echo ""
echo "🔏 [4/5] Récupération de la signature..."

# Chercher le .sig dans le dossier de bundle Tauri
SIG_FILE=$(find "$ROOT_DIR/src-tauri/target/release/bundle" -name "*.app.tar.gz.sig" 2>/dev/null | head -1)
BUNDLE_FILE=$(find "$ROOT_DIR/src-tauri/target/release/bundle" -name "*.app.tar.gz" 2>/dev/null | head -1)

if [ -z "$SIG_FILE" ]; then
  echo "   ⚠️  Fichier .sig introuvable (macOS seulement). Mise à jour de latest.json sans signature."
  SIGNATURE="SIGNATURE_PENDING"
  BUNDLE_URL="https://github.com/Danou75/Studeo-app/releases/download/v$VERSION/StudeoApp_${VERSION}_aarch64.app.tar.gz"
else
  SIGNATURE=$(cat "$SIG_FILE")
  BUNDLE_NAME=$(basename "$BUNDLE_FILE")
  BUNDLE_URL="https://github.com/Danou75/Studeo-app/releases/download/v$VERSION/$BUNDLE_NAME"
  echo "   ✅ Signature récupérée"
fi

# ── 5. Mise à jour de releases/latest.json ────────────────────────────────
echo ""
echo "📋 [5/5] Mise à jour de releases/latest.json..."

PUB_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > "$LATEST_JSON" <<EOF
{
  "version": "$VERSION",
  "notes": "Studeo v$VERSION",
  "pub_date": "$PUB_DATE",
  "platforms": {
    "darwin-aarch64": {
      "signature": "$SIGNATURE",
      "url": "$BUNDLE_URL"
    },
    "darwin-x86_64": {
      "signature": "$SIGNATURE",
      "url": "$BUNDLE_URL"
    },
    "windows-x86_64": {
      "signature": "WINDOWS_SIGNATURE_PENDING",
      "url": "https://github.com/Danou75/Studeo-app/releases/download/v$VERSION/StudeoApp_${VERSION}_x64-setup.exe"
    }
  }
}
EOF

echo "   ✅ releases/latest.json mis à jour"

# ── Commit & push ─────────────────────────────────────────────────────────
echo ""
echo "🚀 Commit + push vers GitHub..."
git add "$TAURI_CONF" "$CARGO_TOML" "$VERSION_JSON" "$LATEST_JSON"
git commit -m "chore: release v$VERSION"
git tag "v$VERSION"
git push origin main
git push origin "v$VERSION"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅ STUDEO v$VERSION DÉPLOYÉ AVEC SUCCÈS !"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Endpoint updater actif :"
echo "║  → https://raw.githubusercontent.com/Danou75/"
echo "║    Studeo-app/main/releases/latest.json"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
