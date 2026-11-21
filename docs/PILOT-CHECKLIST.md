# PILOT-CHECKLIST.md — Go/No-Go Criteria for Classroom Pilot

## Pre-Pilot Checklist

### Infrastructure
- [ ] PostgreSQL 17 + pgvector extension enabled in production DB
- [ ] Redis instance running and reachable from API
- [ ] Laravel Reverb WebSocket server deployed and health check passing
- [ ] FastAPI AI service deployed; `/health` returns `{"status":"ok"}`
- [ ] `.env` has no debug secrets; `APP_ENV=production`, `APP_DEBUG=false`
- [ ] SSL/TLS certificate valid; HSTS header active

### Security
- [ ] All API endpoints require auth (confirmed by SecurityPassTest ✅)
- [ ] Security headers present on all responses (confirmed by SecurityPassTest ✅)
- [ ] AI job rate limit: 20/hr per user (confirmed ✅)
- [ ] Sanctum CSRF cookie domain matches production domain
- [ ] No secrets in git history (`git log --all -S "password"` clean)

### Data & Privacy
- [ ] Consent notice shown to new users on first login
- [ ] `rooms:prune --days=90` scheduled in cron
- [ ] GDPR export endpoint live: `GET /api/v1/me/export`
- [ ] GDPR erasure endpoint live: `DELETE /api/v1/me`

### Functionality (manual smoke test)
- [ ] Teacher: login → create school → create classroom → start room → whiteboard draws
- [ ] Student: join by code → view whiteboard → respond to poll
- [ ] Teacher: raise hand approval flow works
- [ ] Mobile controller: pair via QR → pointer works on projected screen
- [ ] Offline: disconnect, draw, reconnect → events sync
- [ ] AI: teacher generates outline → approves → student requests hint

### Performance
- [ ] PWA builds in < 30s (actual: 13s ✅)
- [ ] canvas-vendor < 400 kB gzip (actual: 106 kB ✅)
- [ ] three-vendor < 100 kB gzip (actual: 66 kB ✅)
- [ ] API health check responds < 100 ms

### Tests (automated — must all pass before pilot)
- [ ] `php artisan test` → 222/222+ PASS
- [ ] `pnpm run test:run` → 325/325+ PASS
- [ ] `pnpm run build` → green
- [ ] `.venv/bin/python -m pytest tests/ -v` → 36/36+ PASS

## Go Decision
**GO** when all boxes above are checked and no P1/P2 bugs are open.
