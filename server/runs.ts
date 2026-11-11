import crypto from 'node:crypto'
import { Db, Tx, sql } from './db.js'
import { ApiError, award, lockPlayer, touchStreak } from './players.js'
import { CHALLENGE_BEAT_COINS, GameId } from '../src/shared/catalog.js'
import * as R from '../src/shared/rules.js'
import { dayIndex, dayKey, weekKey } from '../src/lib/rng.js'
import { makeWindoBoard } from '../src/lib/boards.js'

export type Mark = 'correct' | 'present' | 'absent'
export type RunState = {
  guesses?: string[]; times?: number[]           // fumbua (times = ms since start)
  found?: { w: string; t: number }[]             // windo, recorded live
  helps?: number; extra?: number; level?: number; hints?: Record<number, string>
}
export type Run = {
  id: string; player_id: number; game: GameId; mode: string; seed: string; day: string; week: string
  state: RunState; challenge_code: string | null; duel_id: string | null
  started_at: number; finished_at: number | null; won: boolean; score: number; coins: number; xp: number; doubled: boolean
}

export function evaluate(guess: string, answer: string): Mark[] {
  const res: Mark[] = Array(5).fill('absent')
  const left: Record<string, number> = {}
  for (let i = 0; i < 5; i++) { if (guess[i] === answer[i]) res[i] = 'correct'; else left[answer[i]] = (left[answer[i]] || 0) + 1 }
  for (let i = 0; i < 5; i++) if (res[i] !== 'correct' && left[guess[i]]) { res[i] = 'present'; left[guess[i]]-- }
  return res
}

// Board generation is deterministic but not free; keep recent boards per warm instance.
const boards = new Map<string, ReturnType<typeof makeWindoBoard>>()
export function windoBoard(seed: string) {
  let b = boards.get(seed)
  if (!b) { b = makeWindoBoard(seed); boards.set(seed, b); if (boards.size > 300) boards.delete(boards.keys().next().value!) }
  return b
}
export const windoDeadline = (r: Pick<Run, 'started_at' | 'state'>) => r.started_at + (R.WINDO_TIME + (r.state.extra ?? 0)) * 1000

export const newRunId = () => 'run_' + crypto.randomBytes(10).toString('base64url')

export async function insertRun(db: Db, r: { player_id: number; game: GameId; mode: string; seed: string; state?: RunState; challenge_code?: string | null; duel_id?: string | null; started_at?: number }) {
  const [row] = await db<Run[]>`
    INSERT INTO runs (id, player_id, game, mode, seed, day, week, state, challenge_code, duel_id, started_at)
    VALUES (${newRunId()}, ${r.player_id}, ${r.game}, ${r.mode}, ${r.seed}, ${dayKey()}, ${weekKey()}, ${db.json((r.state ?? {}) as any)},
            ${r.challenge_code ?? null}, ${r.duel_id ?? null}, ${r.started_at ?? Date.now()})
    RETURNING *`
  return row
}

export async function getRun(pid: number, id: string) {
  const [r] = await sql<Run[]>`SELECT * FROM runs WHERE id = ${id} AND player_id = ${pid}`
  if (!r) throw new ApiError(404, 'Mchezo haupo')
  return r
}
export async function saveState(id: string, s: RunState) {
  await sql`UPDATE runs SET state = ${sql.json(s as any)} WHERE id = ${id}`
}

/** What the app may see. The Fumbua answer is only revealed once the run is over. */
export function view(r: Run) {
  const s = r.state
  const base = {
    id: r.id, game: r.game, mode: r.mode, day: r.day, dayIndex: dayIndex(new Date(r.day + 'T12:00:00')),
    startedAt: r.started_at, done: !!r.finished_at, won: r.won, helps: s.helps ?? 0,
    challenge: r.challenge_code, duel: r.duel_id,
  }
  if (r.game === 'fumbua') return { ...base, guesses: (s.guesses ?? []).map(w => ({ word: w, marks: evaluate(w, r.seed) })), hints: s.hints ?? {}, answer: r.finished_at ? r.seed : undefined }
  if (r.game === 'pangua') return { ...base, seed: r.seed, level: s.level }
  if (r.game === 'windo') return { ...base, seed: r.seed, extra: s.extra ?? 0, found: (s.found ?? []).map(f => f.w) }
  return { ...base, seed: r.seed }
}
export type RunView = ReturnType<typeof view>

export function result(r: Run, extra: Record<string, unknown> = {}) {
  return { runId: r.id, won: r.won, score: r.score, coins: r.coins, xp: r.xp, doubled: r.doubled, ...extra }
}

/** Finalise a run exactly once: score, rewards, streak, challenge bonus. */
export async function finishRun(r: Run, won: boolean, score: number, reward: { coins: number; xp: number }) {
  return sql.begin(async tx => {
    const p = await lockPlayer(tx, r.player_id)
    const [claimed] = await tx<Run[]>`UPDATE runs SET finished_at = ${Date.now()} WHERE id = ${r.id} AND finished_at IS NULL RETURNING *`
    if (!claimed) throw new ApiError(409, 'Mchezo umeshaisha', 'already_finished')
    let coins = reward.coins
    let challenge: { beat: boolean; creatorScore: number; rank: number; plays: number; bonus: number } | undefined
    if (r.challenge_code) {
      const [c] = await tx<{ creator_score: number }[]>`SELECT creator_score FROM challenges WHERE code = ${r.challenge_code}`
      const beat = !!c && score > c.creator_score
      if (beat) coins += CHALLENGE_BEAT_COINS
      const [{ ahead, plays }] = await tx<{ ahead: number; plays: number }[]>`
        SELECT COUNT(*) FILTER (WHERE score > ${score})::int ahead, COUNT(*)::int plays FROM runs WHERE challenge_code = ${r.challenge_code} AND finished_at IS NOT NULL AND id <> ${r.id}`
      challenge = { beat, creatorScore: c?.creator_score ?? 0, rank: ahead + (c && c.creator_score > score ? 1 : 0) + 1, plays: plays + 2, bonus: beat ? CHALLENGE_BEAT_COINS : 0 }
    }
    const paid = await award(tx, p, coins, reward.xp)
    // practice/challenge/duel scores count toward the day/week they were finished in
    const [done] = await tx<Run[]>`
      UPDATE runs SET won = ${won}, score = ${score}, coins = ${paid}, xp = ${reward.xp},
        day = CASE WHEN mode = 'daily' THEN day ELSE ${dayKey()} END, week = ${weekKey()}
      WHERE id = ${r.id} RETURNING *`
    await touchStreak(tx, p.id)
    return { run: done, challenge }
  })
}

/** Score + finish a Windo run from the words the server recorded live (plus any in-time stragglers). */
export async function finishWindo(r: Run, extraWords: string[] = []) {
  const board = windoBoard(r.seed)
  const late = Date.now() > windoDeadline(r) + 15_000
  const recorded = (r.state.found ?? []).map(f => f.w)
  const words = [...new Set([...recorded, ...(late ? [] : extraWords.map(w => String(w).toLowerCase()))])].filter(w => board.words.has(w))
  const score = words.reduce((a, w) => a + R.windoPts(w.length), 0)
  const out = await finishRun(r, words.length > 0, score, R.windoReward(score, words.length))
  const missed = [...board.words.keys()].filter(w => !words.includes(w)).sort((a, b) => b.length - a.length)
  return { ...out, extra: { words, total: board.words.size, missed: missed.slice(0, 5) } }
}
