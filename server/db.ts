// Postgres (Neon on Vercel; PGlite over a local socket in dev — see scripts/dev.mjs).
import postgres from 'postgres'

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
if (!url) throw new Error('DATABASE_URL is not set')

const local = /localhost|127\.0\.0\.1/.test(url)
export const sql = postgres(url, {
  // PGlite (dev) serves one connection at a time; Neon's pooler takes several
  max: local ? 1 : process.env.VERCEL ? 3 : 5,
  idle_timeout: 20,
  prepare: false, // works through Neon's pgbouncer pooler
  ssl: local ? false : 'require',
  // bigint (ms timestamps, counts) → JS number
  types: { bigint: { to: 20, from: [20], parse: (x: string) => Number(x), serialize: (x: number) => String(x) } as any },
  onnotice: () => {},
}) as unknown as postgres.Sql<any>
export type Db = postgres.Sql<any>
export type Tx = postgres.TransactionSql<any>

const SCHEMA = `
CREATE TABLE IF NOT EXISTS players (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  region TEXT NOT NULL,
  coins BIGINT NOT NULL DEFAULT 0,
  gems BIGINT NOT NULL DEFAULT 0,
  xp BIGINT NOT NULL DEFAULT 0,
  pro_until BIGINT NOT NULL DEFAULT 0,
  inv JSONB NOT NULL DEFAULT '{}',
  theme TEXT NOT NULL DEFAULT 'karatasi',
  frame TEXT NOT NULL DEFAULT 'none',
  owned_themes JSONB NOT NULL DEFAULT '["karatasi","usiku"]',
  owned_frames JSONB NOT NULL DEFAULT '["none"]',
  streak INT NOT NULL DEFAULT 0,
  best_streak INT NOT NULL DEFAULT 0,
  last_play_day TEXT,
  last_bonus_day TEXT,
  chest_day TEXT,
  pro_hint_day TEXT,
  last_reward_ad BIGINT NOT NULL DEFAULT 0,
  reward_ads_day TEXT,
  reward_ads_count INT NOT NULL DEFAULT 0,
  fumbua_dist JSONB NOT NULL DEFAULT '[0,0,0,0,0,0,0]',
  pangua_level INT NOT NULL DEFAULT 1,
  duel_wins INT NOT NULL DEFAULT 0,
  duel_played INT NOT NULL DEFAULT 0,
  recovery_code TEXT NOT NULL UNIQUE,
  created_at BIGINT NOT NULL,
  last_seen BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  player_id BIGINT NOT NULL REFERENCES players(id),
  game TEXT NOT NULL,
  mode TEXT NOT NULL,              -- daily | practice | level | challenge | duel
  seed TEXT NOT NULL,              -- board seed, or the secret answer for fumbua
  day TEXT NOT NULL,
  week TEXT NOT NULL,
  state JSONB NOT NULL DEFAULT '{}',
  challenge_code TEXT,
  duel_id TEXT,
  started_at BIGINT NOT NULL,
  finished_at BIGINT,
  won BOOLEAN NOT NULL DEFAULT false,
  score INT NOT NULL DEFAULT 0,
  coins INT NOT NULL DEFAULT 0,
  xp INT NOT NULL DEFAULT 0,
  doubled BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS runs_daily_once ON runs(player_id, game, day) WHERE mode = 'daily';
CREATE UNIQUE INDEX IF NOT EXISTS runs_challenge_once ON runs(player_id, challenge_code) WHERE challenge_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS runs_board ON runs(week, day, game) WHERE finished_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS runs_player ON runs(player_id, day);
CREATE INDEX IF NOT EXISTS runs_challenge ON runs(challenge_code) WHERE challenge_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS challenges (
  code TEXT PRIMARY KEY,
  creator_id BIGINT NOT NULL REFERENCES players(id),
  creator_run TEXT NOT NULL UNIQUE,
  game TEXT NOT NULL,
  seed TEXT NOT NULL,
  level INT,
  creator_score INT NOT NULL,
  creator_won BOOLEAN NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS challenges_creator ON challenges(creator_id, created_at);

CREATE TABLE IF NOT EXISTS duels (
  id TEXT PRIMARY KEY,
  game TEXT NOT NULL,
  kind TEXT NOT NULL,              -- queue | room | ghost
  room_code TEXT,
  seed TEXT,
  status TEXT NOT NULL,            -- waiting | live | done | cancelled
  p1 BIGINT NOT NULL REFERENCES players(id),
  p2 BIGINT REFERENCES players(id),
  run1 TEXT,
  run2 TEXT,
  ghost_run TEXT,
  created_at BIGINT NOT NULL,
  starts_at BIGINT,
  ends_at BIGINT,
  winner BIGINT,                   -- player id, 0 = ghost, NULL = draw/unresolved
  resolved_at BIGINT
);
CREATE INDEX IF NOT EXISTS duels_waiting ON duels(game, status, kind, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS duels_room ON duels(room_code) WHERE status = 'waiting';

CREATE TABLE IF NOT EXISTS ad_views (
  id TEXT PRIMARY KEY,
  player_id BIGINT NOT NULL REFERENCES players(id),
  campaign_id BIGINT,
  started_at BIGINT NOT NULL,
  claimed BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  player_id BIGINT NOT NULL REFERENCES players(id),
  product TEXT NOT NULL,
  amount_tzs INT NOT NULL,
  provider TEXT NOT NULL,
  provider_ref TEXT,
  status TEXT NOT NULL,            -- pending | paid | failed
  meta JSONB NOT NULL DEFAULT '{}',
  created_at BIGINT NOT NULL,
  paid_at BIGINT
);
CREATE INDEX IF NOT EXISTS payments_ref ON payments(provider, provider_ref);

CREATE TABLE IF NOT EXISTS ad_campaigns (
  id BIGSERIAL PRIMARY KEY,
  player_id BIGINT NOT NULL REFERENCES players(id),
  slot TEXT NOT NULL,
  brand TEXT NOT NULL,
  line TEXT NOT NULL,
  cta TEXT NOT NULL DEFAULT 'Tazama',
  link TEXT,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  contact TEXT NOT NULL,
  days INT NOT NULL,
  price_tzs INT NOT NULL,
  status TEXT NOT NULL,            -- awaiting_payment | in_review | live | rejected | ended
  review_note TEXT,
  payment_id TEXT,
  starts_at BIGINT,
  ends_at BIGINT,
  impressions INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS league_payouts (
  week TEXT PRIMARY KEY,
  winners JSONB NOT NULL,
  paid_at BIGINT NOT NULL
);
`

let ready: Promise<void> | null = null
/** Create tables once per process (cold start). Idempotent. */
export function ensureSchema() {
  ready ??= sql.unsafe(SCHEMA).then(() => undefined).catch(e => { ready = null; throw e })
  return ready
}
