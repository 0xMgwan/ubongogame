# Ubongo 🧠

Four Swahili word games — **Fumbua** (word of the day), **Mafumbo** (crossword), **Windo** (word hunt), **Pangua** (anagram wheel) — plus live 1v1 **Vita** duels, WhatsApp **challenge links**, leagues, a shop, Kifalme subscription and paid ad slots. Visual language follows the Bongo Life landing page (paper & ink, hard shadows, custom icons — no emoji in the UI).

## Run locally
```bash
npm install
npm run dev        # app :5180 · API :8790 · PGlite Postgres :54329 (data in ./data/pg)
```
No database setup needed locally. Payments run in **demo mode** (auto-confirm ~6s). Admin: http://localhost:5180/admin (key `dev-admin`).

## Architecture
- `src/` — React app. Shared with the server: `src/shared/*` (prices, rules), `src/lib/{rng,solver,crossword,boards}.ts`, `src/data/words.ts`.
- `server/app.ts` — Express API, deployed as one Vercel Function (`api/index.ts`). Postgres via `postgres` (Neon in prod).
  - Every game is a **run** the server creates; it keeps the Fumbua answer secret and re-scores everything from the seed. Windo words are submitted live with timestamps.
  - **Vita** (`server/duels.ts`): queue matchmaking, private 4-letter rooms, and *ghost* races against a real recorded run when nobody's online. Clients poll `GET /api/duels/:id` (~1s) — no websockets needed on Vercel.
  - **Changamoto** (`server/challenges.ts`): `/c/:code` links; everyone plays the same puzzle once and is ranked; beating the sender pays a bonus.
  - Payments: nTZS mobile money (`server/payments.ts`), fulfilled once via signed webhook or polling.
  - Daily Vercel Cron → `/api/cron/housekeeping`: ends expired ads, pays weekly league winners (💎50 to top 3). Game days follow EAT (UTC+3).

## Deploy on Vercel
1. Import the repo in Vercel (root: `ubongo`). Framework is detected from `vercel.json`.
2. **Storage → Create → Neon Postgres** and connect it to the project (sets `DATABASE_URL`). Tables are created automatically on first request.
3. Environment variables: `JWT_SECRET`, `ADMIN_KEY`, `CRON_SECRET`, and for real money `NTZS_API_KEY` + `NTZS_WEBHOOK_SECRET` (see `.env.example`).
4. In the nTZS dashboard set the webhook to `https://<domain>/api/webhooks/ntzs`.
