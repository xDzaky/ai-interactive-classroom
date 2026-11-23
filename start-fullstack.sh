#!/usr/bin/env bash
# ==============================================================================
# start-fullstack.sh — Multi-Service Runner for AI Interactive Classroom
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================================="
echo "  🚀 AI Interactive Classroom — Fullstack Services"
echo "=========================================================="
echo ""

# 1. Check Docker for PostgreSQL & Redis
echo "1️⃣  Memeriksa Docker & Database (PostgreSQL + Redis)..."
if command -v docker >/dev/null 2>&1; then
  if docker compose ps >/dev/null 2>&1; then
    docker compose up -d
    echo "   ✅ PostgreSQL (5432) & Redis (6379) berjalan."
  else
    echo "   ⚠️  Docker daemon tidak aktif atau docker compose tidak merespons. Lewati docker."
  fi
else
  echo "   ⚠️  Docker tidak terpasang. Pastikan PostgreSQL (5432) dan Redis (6379) berjalan lokal."
fi

# 2. Setup Backend .env & migrations
echo ""
echo "2️⃣  Memeriksa Laravel API..."
if [ -d "apps/api" ]; then
  cd apps/api
  if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
    php artisan key:generate || true
  fi
  cd "$SCRIPT_DIR"
fi

echo ""
echo "=========================================================="
echo "  Layanan dapat dijalankan dalam terminal terpisah:"
echo "=========================================================="
echo "  [Terminal 1] Laravel API        : cd apps/api && php artisan serve --port=8000"
echo "  [Terminal 2] Reverb WebSocket   : cd apps/api && php artisan reverb:start --port=8080"
echo "  [Terminal 3] FastAPI AI Service : cd apps/ai-service && uv run uvicorn app.main:app --reload --port 8100"
echo "  [Terminal 4] React Web (PWA)    : cd apps/web && npm run dev"
echo "=========================================================="
echo ""

read -p "Ingin langsung jalankan React Web Frontend sekarang? (Y/n): " confirm
if [[ "$confirm" =~ ^[Nn]$ ]]; then
  echo "Selesai. Jalankan command terminal di atas sesuai kebutuhan."
else
  ./start-web.sh
fi
