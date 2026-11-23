#!/usr/bin/env bash
# ==============================================================================
# start-web.sh — 1-Click Runner for AI Interactive Classroom (Whiteboard Web)
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================================="
echo "  🚀 AI Interactive Classroom — Whiteboard Web Frontend"
echo "=========================================================="
echo ""

# Check node
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Error: Node.js belum terinstall. Install Node.js v20+ terlebih dahulu."
  exit 1
fi

echo "📦 Memeriksa dependencies..."
if [ ! -d "node_modules" ] || [ ! -d "apps/web/node_modules" ]; then
  echo "📥 Menginstall node_modules..."
  if command -v pnpm >/dev/null 2>&1; then
    pnpm install
  else
    npx pnpm install
  fi
fi

echo ""
echo "✨ Menjalankan Whiteboard Frontend (Vite)..."
echo "👉 Buka di browser:"
echo "   Whiteboard Canvas : http://localhost:5173/whiteboard"
echo "   Halaman Utama     : http://localhost:5173"
echo "=========================================================="
echo ""

cd "$SCRIPT_DIR/apps/web"
npm run dev
