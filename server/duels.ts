// Vita: live 1v1 duels. Clients poll GET /duels/:id (~1s); no websockets needed on Vercel.
//  - queue: open matchmaking per game
//  - room:  private 4-letter code to share on WhatsApp
//  - ghost: race a real recorded run by another player (labelled as a recording)
import { Router } from 'express'
import crypto from 'node:crypto'
import { Tx, sql } from './db.js'
import { ApiError, award, lockPlayer, mustPlayer, publicPlayer } from './players.js'
import { Mark, Run, evaluate, finishRun, finishWindo, insertRun, view, windoDeadline } from './runs.js'
import { DUEL } from '../src/shared/catalog.js'
import * as R from '../src/shared/rules.js'
import { pick, rngFor } from '../src/lib/rng.js'
import { FUMBUA_ANSWERS } from '../src/data/words.js'
import type { NextFunction, Request, Response } from 'express'

const h = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next)

type DuelGame = 'windo' | 'fumbua'
const DUEL_GAMES: DuelGame[] = ['windo', 'fumbua']
type Duel = {
  id: string; game: DuelGame; kind: 'queue' | 'room' | 'ghost'; room_code: string | null; seed: string | null; status: string
  p1: number; p2: number | null; run1: string | null; run2: string | null; ghost_run: string | null
  created_at: number; starts_at: number | null; ends_at: number | null; winner: number | null; resolved_at: number | null
}

const duration = (g: DuelGame) => (g === 'windo' ? DUEL.windoMs : DUEL.fumbuaMs)
const newSeed = (g: DuelGame) => (g === 'fumbua' ? pick(FUMBUA_ANSWERS, rngFor(crypto.randomUUID())) : `windo-${crypto.randomBytes(6).toString('hex')}`)
const roomCode = () => Array.from(crypto.randomBytes(4), b => 'ABCDEFGHJKLMNPRSTUVWXYZ'[b % 23]).join('')

/** Turn a waiting duel into a live one: same seed, both runs start after the countdown. */
async function start(tx: Tx, d: Duel, p2: number) {
  const seed = newSeed(d.game)
  const startsAt = Date.now() + DUEL.countdownMs
  const endsAt = startsAt + duration(d.game)
  const r1 = await insertRun(tx, { player_id: d.p1, game: d.game, mode: 'duel', seed, duel_id: d.id, started_at: startsAt })
  const r2 = await insertRun(tx, { player_id: p2, game: d.game, mode: 'duel', seed, duel_id: d.id, started_at: startsAt })
  await tx`UPDATE duels SET status = 'live', p2 = ${p2}, seed = ${seed}, run1 = ${r1.id}, run2 = ${r2.id}, starts_at = ${startsAt}, ends_at = ${endsAt} WHERE id = ${d.id}`
}

/** Pick a real finished run by someone else to race against. */
async function ghostSource(db: Tx, game: DuelGame, me: number) {
  const [g] = game === 'windo'
    ? await db<Run[]>`SELECT * FROM (SELECT * FROM runs WHERE game = 'windo' AND finished_at IS NOT NULL AND player_id <> ${me}
        AND jsonb_array_length(COALESCE(state->'found','[]'::jsonb)) >= 3 ORDER BY finished_at DESC LIMIT 300) t ORDER BY random() LIMIT 1`
    : await db<Run[]>`SELECT * FROM (SELECT * FROM runs WHERE game = 'fumbua' AND finished_at IS NOT NULL AND player_id <> ${me}
        AND state ? 'times' ORDER BY finished_at DESC LIMIT 300) t ORDER BY random() LIMIT 1`
  return g
}

async function startGhost(tx: Tx, d: Duel | null, game: DuelGame, me: number) {
  const g = await ghostSource(tx, game, me)
  if (!g) throw new ApiError(404, 'Hakuna rekodi za wachezaji bado — mwalike rafiki!', 'no_ghost')
  const id = d?.id ?? 'duel_' + crypto.randomBytes(8).toString('base64url')
  const startsAt = Date.now() + DUEL.countdownMs
  if (!d) await tx`INSERT INTO duels (id, game, kind, status, p1, created_at) VALUES (${id}, ${game}, 'ghost', 'waiting', ${me}, ${Date.now()})`
  const r1 = await insertRun(tx, { player_id: me, game, mode: 'duel', seed: g.seed, duel_id: id, started_at: startsAt })
  await tx`UPDATE duels SET kind = 'ghost', status = 'live', seed = ${g.seed}, run1 = ${r1.id}, ghost_run = ${g.id},
    starts_at = ${startsAt}, ends_at = ${startsAt + duration(game)} WHERE id = ${id}`
  return id
}

// ---------------- progress & resolution ----------------
type Side = { score: number; words?: number; rows?: Mark[][]; solved?: boolean; guesses?: number; solvedAt?: number | null; done: boolean }

function progressOf(r: Run, game: DuelGame, upTo = Infinity): Side {
  if (game === 'windo') {
    const found = (r.state.found ?? []).filter(f => f.t <= upTo)
    return { score: found.reduce((a, f) => a + R.windoPts(f.w.length), 0), words: found.length, done: !!r.finished_at && upTo === Infinity }
  }
  const times = r.state.times ?? []
  const guesses = (r.state.guesses ?? []).filter((_, i) => (times[i] ?? 0) <= upTo)
  const rows = guesses.map(w => evaluate(w, r.seed))
  const solvedIdx = guesses.findIndex(w => w === r.seed)
  return {
    score: guesses.length, rows, guesses: guesses.length, solved: solvedIdx >= 0,
    solvedAt: solvedIdx >= 0 ? times[solvedIdx] ?? null : null,
    done: solvedIdx >= 0 || guesses.length >= 6 || (!!r.finished_at && upTo === Infinity),
  }
}

/** >0 if a beats b, <0 if b beats a, 0 draw. */
function compare(game: DuelGame, a: Side, b: Side) {
  if (game === 'windo') return a.score - b.score
  if (a.solved !== b.solved) return a.solved ? 1 : -1
  if (!a.solved) return 0
  if (a.guesses !== b.guesses) return (b.guesses ?? 7) - (a.guesses ?? 7)
  return (b.solvedAt ?? Infinity) - (a.solvedAt ?? Infinity)
}

async function runById(id: string | null) {
  if (!id) return null
  const [r] = await sql<Run[]>`SELECT * FROM runs WHERE id = ${id}`
  return r ?? null
}

/** Force-finish runs that ran out of time, then settle the duel exactly once. */
export async function resolveDuelFor(duelId: string) {
  const [d] = await sql<Duel[]>`SELECT * FROM duels WHERE id = ${duelId}`
  if (!d || d.status !== 'live') return
  const now = Date.now()
  const grace = d.ends_at! + 4000
  const runs = [await runById(d.run1), await runById(d.run2)].filter(Boolean) as Run[]
  for (const r of runs) {
    if (r.finished_at) continue
    const timeUp = d.game === 'windo' ? now > windoDeadline(r) + 1500 : now > grace
    if (!timeUp) continue
    try {
      if (d.game === 'windo') await finishWindo(r)
      else await finishRun(r, false, R.fumbuaScore(false, 6, false), R.fumbuaReward(false, 6))
    } catch (e: any) { if (e?.code !== 'already_finished') throw e }
  }
  const [r1, r2] = [await runById(d.run1), await runById(d.run2)]
  if (!r1?.finished_at || (d.kind !== 'ghost' && !r2?.finished_at)) return
  const ghost = d.kind === 'ghost' ? await runById(d.ghost_run) : null
  const a = progressOf(r1, d.game)
  const b = ghost ? progressOf(ghost, d.game) : progressOf(r2!, d.game)
  const c = compare(d.game, a, b)
  const winner = c > 0 ? d.p1 : c < 0 ? (ghost ? 0 : d.p2!) : null
  await sql.begin(async tx => {
    const [won] = await tx`UPDATE duels SET status = 'done', winner = ${winner}, resolved_at = ${now} WHERE id = ${d.id} AND status = 'live' RETURNING id`
    if (!won) return
    const players = [d.p1, ...(ghost ? [] : [d.p2!])]
    await tx`UPDATE players SET duel_played = duel_played + 1 WHERE id IN ${tx(players)}`
    if (winner) {
      const p = await lockPlayer(tx, winner)
      await award(tx, p, ghost ? DUEL.ghostWinCoins : DUEL.winCoins, 25)
      await tx`UPDATE players SET duel_wins = duel_wins + 1 WHERE id = ${winner}`
    }
  })
}

// ---------------- routes ----------------
export const duels = Router()

duels.post('/duels', h(async (req, res) => {
  const me = req.pid
  await mustPlayer(me)
  const game = req.body?.game as DuelGame
  const mode = String(req.body?.mode || 'queue')
  if (!DUEL_GAMES.includes(game) && mode !== 'join') throw new ApiError(400, 'Vita ni kwa Windo au Fumbua')
  const id = await sql.begin(async tx => {
    // one open lobby per player
    await tx`UPDATE duels SET status = 'cancelled' WHERE p1 = ${me} AND status = 'waiting'`
    if (mode === 'join') {
      const code = String(req.body?.code || '').toUpperCase().trim()
      const [d] = await tx<Duel[]>`SELECT * FROM duels WHERE room_code = ${code} AND status = 'waiting' AND kind = 'room' FOR UPDATE`
      if (!d) throw new ApiError(404, 'Chumba hicho hakipo au kimeshaanza', 'no_room')
      if (d.p1 === me) throw new ApiError(400, 'Huu ni chumba chako — mtumie rafiki msimbo')
      await start(tx, d, me)
      return d.id
    }
    if (mode === 'ghost') return startGhost(tx, null, game, me)
    const did = 'duel_' + crypto.randomBytes(8).toString('base64url')
    if (mode === 'room') {
      await tx`INSERT INTO duels (id, game, kind, room_code, status, p1, created_at) VALUES (${did}, ${game}, 'room', ${roomCode()}, 'waiting', ${me}, ${Date.now()})`
      return did
    }
    const [open] = await tx<Duel[]>`SELECT * FROM duels WHERE game = ${game} AND kind = 'queue' AND status = 'waiting' AND p1 <> ${me}
      AND created_at > ${Date.now() - 30_000} ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED`
    if (open) { await start(tx, open, me); return open.id }
    await tx`INSERT INTO duels (id, game, kind, status, p1, created_at) VALUES (${did}, ${game}, 'queue', 'waiting', ${me}, ${Date.now()})`
    return did
  })
  res.json(await duelView(id, me))
}))

duels.post('/duels/:id/ghost', h(async (req, res) => {
  await sql.begin(async tx => {
    const [d] = await tx<Duel[]>`SELECT * FROM duels WHERE id = ${req.params.id} AND p1 = ${req.pid} AND status = 'waiting' FOR UPDATE`
    if (!d) throw new ApiError(409, 'Mpinzani amepatikana tayari', 'already_matched')
    await startGhost(tx, d, d.game, req.pid)
  })
  res.json(await duelView(req.params.id, req.pid))
}))

duels.post('/duels/:id/cancel', h(async (req, res) => {
  await sql`UPDATE duels SET status = 'cancelled' WHERE id = ${req.params.id} AND p1 = ${req.pid} AND status = 'waiting'`
  res.json({ ok: true })
}))

duels.get('/duels/:id', h(async (req, res) => {
  await resolveDuelFor(req.params.id).catch(e => console.warn('[duel] resolve', e?.message))
  res.json(await duelView(req.params.id, req.pid))
}))

async function duelView(id: string, me: number) {
  const [d] = await sql<Duel[]>`SELECT * FROM duels WHERE id = ${id}`
  if (!d || (d.p1 !== me && d.p2 !== me)) throw new ApiError(404, 'Vita haipo')
  const now = Date.now()
  const iAmP1 = d.p1 === me
  const base = { id: d.id, game: d.game, kind: d.kind, status: d.status, roomCode: d.room_code, now, startsAt: d.starts_at, endsAt: d.ends_at, waitedMs: now - d.created_at }
  if (d.status === 'waiting' || d.status === 'cancelled') return { ...base, me: null, opp: null, outcome: null }
  const mine = await runById(iAmP1 ? d.run1 : d.run2)
  const theirs = d.kind === 'ghost' ? await runById(d.ghost_run) : await runById(iAmP1 ? d.run2 : d.run1)
  const oppId = d.kind === 'ghost' ? theirs!.player_id : (iAmP1 ? d.p2 : d.p1)!
  const [op] = await sql<any[]>`SELECT id, name, avatar, frame, pro_until, region, duel_wins FROM players WHERE id = ${oppId}`
  // ghosts replay in real time from the duel's start; real opponents show what they've done so far
  const elapsed = Math.max(0, now - (d.starts_at ?? now))
  const oppSide = theirs ? progressOf(theirs, d.game, d.kind === 'ghost' && d.status === 'live' ? elapsed : Infinity) : null
  const outcome = d.status === 'done' ? (d.winner === null ? 'draw' : d.winner === me ? 'win' : 'lose') : null
  return {
    ...base,
    me: mine ? { runId: mine.id, ...progressOf(mine, d.game) } : null,
    myRun: mine ? view(mine) : null, // fumbua answer stays hidden until the run is over
    opp: { player: { ...publicPlayer(op), duelWins: op.duel_wins }, ghost: d.kind === 'ghost', ...oppSide, answer: d.status === 'done' && d.game === 'fumbua' ? theirs?.seed : undefined },
    outcome,
    reward: outcome === 'win' ? (d.kind === 'ghost' ? DUEL.ghostWinCoins : DUEL.winCoins) : 0,
  }
}
