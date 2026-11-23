# 📋 Panduan Setup & Daftar Command Run (AI Interactive Classroom)

File ini berisi seluruh perintah (command) untuk menjalankan, menguji, dan membangun project **AI Interactive Classroom**.

---

## ⚡ 1. Mode Cepat: Whiteboard Web Standalone (Paling Sering Digunakan)

Jika Anda hanya ingin menjalankan **Whiteboard Interaktif** (dengan fitur tema putih, bangun ruang 3D Three.js, irisan cross-section, jaring/unfold, roda menu AI klik kanan, dan manipulasi objek):

### Cara 1: Menggunakan Script Otomatis (1-Klik)
```bash
./start-web.sh
```

### Cara 2: Manual lewat Terminal
```bash
cd apps/web
npm run dev
```
Atau dari root folder:
```bash
npx pnpm --filter @ai-classroom/web dev
```

> 🌐 **Buka di Browser:**
> - **Whiteboard Canvas**: [http://localhost:5173/whiteboard](http://localhost:5173/whiteboard)
> - **Halaman Utama**: [http://localhost:5173](http://localhost:5173)

*Catatan: Mode ini berjalan mandiri di browser (client-side) tanpa memerlukan database atau backend.*

---

## 🏢 2. Mode Lengkap (Fullstack: Web + API + WebSockets + AI Service)

Jika ingin menjalankan seluruh ekosistem (Multi-tenant Classroom, Sinkronisasi Realtime Guru-Siswa, dan AI Teaching Assistant):

### Langkah 1: Jalankan Database & Cache (Docker Compose)
Menjalankan PostgreSQL 17 (dengan pgvector) dan Redis 7:
```bash
docker compose up -d
```
*Port: PostgreSQL (`5432`), Redis (`6379`), Mailpit UI (`8025`)*

---

### Langkah 2: Setup & Jalankan Laravel 13 API (Terminal 1)
```bash
cd apps/api

# Salin .env dan install dependensi PHP (hanya pertama kali)
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed

# Jalankan REST API Server
php artisan serve --port=8000
```
> 🌐 **API Base URL**: `http://localhost:8000/api/v1`

---

### Langkah 3: Jalankan Laravel Reverb WebSocket Server (Terminal 2)
Dibutuhkan untuk sinkronisasi live whiteboard antar siswa & guru:
```bash
cd apps/api
php artisan reverb:start --port=8080
```
> 🔌 **WebSocket Port**: `8080`

---

### Langkah 4: Jalankan FastAPI AI Microservice (Terminal 3)
Dibutuhkan untuk RAG embedding materi pelajaran dan AI Socratic Tutor:
```bash
cd apps/ai-service

# Sinkronkan environment Python & dependensi
uv sync

# Jalankan server FastAPI
uv run uvicorn app.main:app --reload --port 8100
```
> 🌐 **AI Service Docs**: `http://localhost:8100/docs`

---

### Langkah 5: Jalankan React Web Frontend (Terminal 4)
```bash
cd apps/web
npm run dev
```
> 🌐 **Frontend URL**: `http://localhost:5173`

---

## 🧪 3. Perintah Testing (Uji Coba & Verifikasi)

Jalankan test suite untuk memastikan semua fungsi berjalan 100%:

### Test Frontend & Unit Test Matematika (Vitest)
```bash
# Dari root folder:
npm run test:web

# Atau menjalankan semua test package & web:
npm run test:all

# Atau langsung di folder web:
cd apps/web && npm test
```

### Test Backend Laravel API (PHPUnit)
```bash
cd apps/api
php artisan test
```

### Test FastAPI AI Microservice (Pytest)
```bash
cd apps/ai-service
uv run pytest tests/ -v
```

### Typecheck & Linter
```bash
# TypeScript Typecheck
npx pnpm -r typecheck

# Linter
npx pnpm -r lint

# Verifikasi Lisensi Third-Party (0 non-permissive)
node scripts/check-third-party.mjs
```

---

## 📦 4. Perintah Build Production

Untuk mengompilasi aplikasi menjadi berkas statis siap rilis (PWA & Service Worker):

```bash
# Build aplikasi Web
cd apps/web
npm run build

# Preview hasil build production di lokal
npm run preview
```

---

## 📌 Ringkasan Port & Service

| Service | Direktori | Port | URL / Deskripsi |
|---|---|---|---|
| **React Web PWA** | `apps/web` | `5173` | [http://localhost:5173/whiteboard](http://localhost:5173/whiteboard) |
| **Laravel 13 API** | `apps/api` | `8000` | [http://localhost:8000/api/v1](http://localhost:8000/api/v1) |
| **Reverb WebSockets** | `apps/api` | `8080` | `ws://localhost:8080` |
| **FastAPI AI Service**| `apps/ai-service` | `8100` | [http://localhost:8100/docs](http://localhost:8100/docs) |
| **PostgreSQL 17** | `infra/` | `5432` | Database dengan ekstensi `pgvector` |
| **Redis 7** | `infra/` | `6379` | Cache & Pub/Sub queue |
| **Mailpit** | `infra/` | `8025` | [http://localhost:8025](http://localhost:8025) (Email testing) |

---

## 💡 Troubleshooting Cepat

- **Port 5173 sudah terpakai?**  
  Vite akan otomatis menawarkan port berikutnya seperti `5174`, atau gunakan flag:
  ```bash
  cd apps/web && npm run dev -- --port 3000
  ```
- **Error node_modules / pnpm?**  
  Jalankan di root:
  ```bash
  npx pnpm install
  ```
- **Ingin menjalankan background tanpa banyak terminal?**  
  Gunakan `./start-fullstack.sh` untuk panduan interaktif.
