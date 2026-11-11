// Changamoto: turn any finished run into a link. Everyone who opens it plays the exact same puzzle
// once, and gets ranked against the creator and each other.
import { Router } from 'express'
import crypto from 'node:crypto'
import { sql } from './db.js'
import { ApiError, mustPlayer, publicPlayer } from './players.js'
import { Run, getRun, insertRun, result, view } from './runs.js'
import { h } from './games.js'

type Challenge = { code: string; creator_id: number; creator_run: string; game: string; seed: string; level: number | null; creator_score: number; creator_won: boolean; created_at: number }

const newCode = () => Array.from(crypto.randomBytes(6), b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('')

async function getChallenge(code: string) {
  const [c] = await sql<Challenge[]>`SELECT * FROM challenges WHERE code = ${code.toLowerCase()}`
  if (!c) throw new ApiError(404, 'Changamoto hiyo haipo', 'no_challenge')
  return c
}

async function board(c: Challenge, limit = 10) {
  const rows = await sql<any[]>`
    SELECT p.id, p.name, p.avatar, p.frame, p.pro_until, p.region, r.score, r.won, r.finished_at
    FROM runs r JOIN players p ON p.id = r.player_id
    WHERE (r.challenge_code = ${c.code} OR r.id = ${c.creator_run}) AND r.finished_at IS NOT NULL
    ORDER BY r.score DESC, r.finished_at ASC LIMIT ${limit}`
  const [{ n }] = await sql<{ n: number }[]>`SELECT COUNT(*)::int n FROM runs WHERE challenge_code = ${c.code} AND finished_at IS NOT NULL`
  return { plays: n, rows: rows.map(r => ({ ...publicPlayer(r), score: r.score, won: r.won, creator: r.id === c.creator_id })) }
}

/** Public: anyone with the link can see who sent it and the standings (before signing up). */
export const publicChallenges = Router()
publicChallenges.get('/challenges/:code', h(async (req, res) => {
  const c = await getChallenge(req.params.code)
  const [creator] = await sql<any[]>`SELECT id, name, avatar, frame, pro_until, region FROM players WHERE id = ${c.creator_id}`
  res.json({ code: c.code, game: c.game, level: c.level, creatorScore: c.creator_score, creator: publicPlayer(creator), createdAt: c.created_at, ...(await board(c)) })
}))

export const challenges = Router()

challenges.post('/challenges', h(async (req, res) => {
  const r = await getRun(req.pid, String(req.body?.runId))
  if (!r.finished_at) throw new ApiError(400, 'Maliza mchezo kwanza')
  if (r.mode === 'duel') throw new ApiError(400, 'Vita haiwezi kuwa changamoto')
  if (r.challenge_code) { // re-share the challenge you were sent
    return res.json({ code: r.challenge_code })
  }
  const [existing] = await sql<{ code: string }[]>`SELECT code FROM challenges WHERE creator_run = ${r.id}`
  if (existing) return res.json({ code: existing.code })
  const code = newCode()
  await sql`INSERT INTO challenges (code, creator_id, creator_run, game, seed, level, creator_score, creator_won, created_at)
    VALUES (${code}, ${req.pid}, ${r.id}, ${r.game}, ${r.seed}, ${r.state.level ?? null}, ${r.score}, ${r.won}, ${Date.now()})`
  res.json({ code })
}))

challenges.post('/challenges/:code/play', h(async (req, res) => {
  const c = await getChallenge(req.params.code)
  if (c.creator_id === req.pid) throw new ApiError(400, 'Hii ni changamoto yako — itume kwa marafiki', 'own_challenge')
  await mustPlayer(req.pid)
  const [mine] = await sql<Run[]>`SELECT * FROM runs WHERE player_id = ${req.pid} AND challenge_code = ${c.code}`
  if (mine) return res.json({ run: view(mine), result: mine.finished_at ? result(mine) : null })
  const run = await insertRun(sql, { player_id: req.pid, game: c.game as any, mode: 'challenge', seed: c.seed, state: c.level ? { level: c.level } : {}, challenge_code: c.code })
  res.json({ run: view(run), result: null })
}))

/** Challenges I sent (with standings) and ones I played. */
challenges.get('/challenges', h(async (req, res) => {
  const sent = await sql<Challenge[]>`SELECT * FROM challenges WHERE creator_id = ${req.pid} ORDER BY created_at DESC LIMIT 15`
  const played = await sql<any[]>`
    SELECT c.code, c.game, c.creator_score, r.score, r.finished_at, p.name creator_name, p.avatar creator_avatar
    FROM runs r JOIN challenges c ON c.code = r.challenge_code JOIN players p ON p.id = c.creator_id
    WHERE r.player_id = ${req.pid} ORDER BY r.started_at DESC LIMIT 15`
  const withBoards = await Promise.all(sent.map(async c => ({ code: c.code, game: c.game, score: c.creator_score, createdAt: c.created_at, ...(await board(c, 3)) })))
  res.json({ sent: withBoards, played: played.map(p => ({ code: p.code, game: p.game, creatorScore: p.creator_score, score: p.finished_at ? p.score : null, creator: { name: p.creator_name, avatar: p.creator_avatar } })) })
}))
