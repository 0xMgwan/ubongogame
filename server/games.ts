import { NextFunction, Request, Response, Router } from 'express'
import { sql } from './db.js'
import { ApiError, consumeItem, lockPlayer, me, mustPlayer } from './players.js'
import { Run, evaluate, finishRun, finishWindo, getRun, insertRun, result, saveState, view, windoBoard, windoDeadline } from './runs.js'
import { resolveDuelFor } from './duels.js'
import { GAME_IDS, GameId, Item } from '../src/shared/catalog.js'
import * as R from '../src/shared/rules.js'
import { dayIndex, dayKey, pick, rngFor } from '../src/lib/rng.js'
import { FUMBUA_ANSWERS, LEXSET } from '../src/data/words.js'
import { fumbuaDailyAnswer, panguaBase, panguaTargets } from '../src/lib/boards.js'
import { makeCrossword } from '../src/lib/crossword.js'
import crypto from 'node:crypto'

export const h = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next)

export const games = Router()

/** Runs that belong to a duel can't be played before the countdown ends. */
function assertStarted(r: Run) {
  if (Date.now() < r.started_at - 300) throw new ApiError(425, 'Subiri, mchezo bado haujaanza', 'not_started')
}

// ---- start (or resume) a solo run ----
games.post('/runs', h(async (req, res) => {
  const p = await mustPlayer(req.pid)
  const game = req.body?.game as GameId
  if (!GAME_IDS.includes(game)) throw new ApiError(400, 'Mchezo haujulikani')
  const today = dayKey()

  if (req.body?.mode === 'daily' && (game === 'fumbua' || game === 'mafumbo')) {
    const [existing] = await sql<Run[]>`SELECT * FROM runs WHERE player_id = ${p.id} AND game = ${game} AND day = ${today} AND mode = 'daily'`
    if (existing) return res.json({ run: view(existing), result: existing.finished_at ? result(existing) : null })
    const seed = game === 'fumbua' ? fumbuaDailyAnswer(dayIndex()) : 'cw-' + today
    try {
      return res.json({ run: view(await insertRun(sql, { player_id: p.id, game, mode: 'daily', seed })), result: null })
    } catch {
      // a parallel request created it first
      const [r] = await sql<Run[]>`SELECT * FROM runs WHERE player_id = ${p.id} AND game = ${game} AND day = ${today} AND mode = 'daily'`
      return res.json({ run: view(r), result: r.finished_at ? result(r) : null })
    }
  }

  let seed: string, mode = 'practice'
  const state: Run['state'] = {}
  if (game === 'fumbua') seed = pick(FUMBUA_ANSWERS, rngFor(crypto.randomUUID()))
  else if (game === 'pangua') { state.level = p.pangua_level; seed = panguaBase(p.pangua_level); mode = 'level' }
  else seed = `${game}-${crypto.randomBytes(6).toString('hex')}`
  res.json({ run: view(await insertRun(sql, { player_id: p.id, game, mode, seed, state })), result: null })
}))

// ---- Fumbua: the answer never leaves the server until the run is over ----
games.post('/runs/:id/guess', h(async (req, res) => {
  const r = await getRun(req.pid, req.params.id)
  if (r.game !== 'fumbua') throw new ApiError(400, 'Si Fumbua')
  if (r.finished_at) throw new ApiError(409, 'Mchezo umeshaisha', 'already_finished')
  assertStarted(r)
  const word = String(req.body?.word || '').toLowerCase()
  if (!/^[a-z]{5}$/.test(word)) throw new ApiError(400, 'Herufi hazitoshi', 'bad_length')
  if (!LEXSET.has(word)) throw new ApiError(400, 'Neno halipo kamusini', 'not_a_word')
  const guesses = [...(r.state.guesses ?? []), word]
  const times = [...(r.state.times ?? []), Date.now() - r.started_at]
  r.state = { ...r.state, guesses, times }
  await saveState(r.id, r.state)
  const won = word === r.seed
  let out: any = null, fresh = r
  if (won || guesses.length >= 6) {
    const n = guesses.length
    const fin = await finishRun(r, won, R.fumbuaScore(won, n, r.mode === 'daily'), R.fumbuaReward(won, n))
    fresh = fin.run
    if (r.mode === 'daily') await sql.begin(async tx => {
      const p = await lockPlayer(tx, r.player_id)
      const dist = [...p.fumbua_dist]; dist[won ? n - 1 : 6]++
      await tx`UPDATE players SET fumbua_dist = ${tx.json(dist)} WHERE id = ${p.id}`
    })
    out = result(fresh, { challenge: fin.challenge })
    if (r.duel_id) await resolveDuelFor(r.duel_id)
  }
  res.json({ marks: evaluate(word, r.seed), run: view(fresh), result: out, me: await me(req.pid) })
}))

// ---- Windo: words are submitted as they're found (server-validated, timestamped) ----
games.post('/runs/:id/word', h(async (req, res) => {
  const r = await getRun(req.pid, req.params.id)
  if (r.game !== 'windo') throw new ApiError(400, 'Si Windo')
  if (r.finished_at) throw new ApiError(409, 'Mchezo umeshaisha', 'already_finished')
  assertStarted(r)
  const t = Date.now() - r.started_at
  if (Date.now() > windoDeadline(r) + 3000) throw new ApiError(400, 'Muda umeisha', 'time_up')
  const w = String(req.body?.word || '').toLowerCase()
  const found = r.state.found ?? []
  if (!windoBoard(r.seed).words.has(w)) throw new ApiError(400, 'Si neno', 'not_a_word')
  if (found.some(f => f.w === w)) return res.json({ ok: false, dup: true, score: found.reduce((a, f) => a + R.windoPts(f.w.length), 0) })
  // conditional update so two fast submissions can't clobber each other
  const next = [...found, { w, t }]
  const upd = await sql`UPDATE runs SET state = ${sql.json({ ...r.state, found: next } as any)} WHERE id = ${r.id} AND finished_at IS NULL AND jsonb_array_length(COALESCE(state->'found','[]'::jsonb)) = ${found.length}`
  if (!upd.count) throw new ApiError(409, 'Jaribu tena', 'retry')
  res.json({ ok: true, pts: R.windoPts(w.length), score: next.reduce((a, f) => a + R.windoPts(f.w.length), 0) })
}))

// ---- power-ups (charged server-side; reduce the score through `helps`) ----
games.post('/runs/:id/item', h(async (req, res) => {
  const r = await getRun(req.pid, req.params.id)
  if (r.finished_at) throw new ApiError(409, 'Mchezo umeshaisha', 'already_finished')
  if (r.duel_id) throw new ApiError(400, 'Hakuna misaada kwenye Vita', 'no_items_in_duel')
  const item = req.body?.item as Item
  if (!['dokezo', 'muda', 'bomu'].includes(item)) throw new ApiError(400, 'Kifaa hakijulikani')
  if (item === 'muda' && r.game !== 'windo') throw new ApiError(400, 'Muda ni kwa Windo tu')
  const s = r.state
  let reveal: { index: number; letter: string } | undefined
  if (r.game === 'fumbua') {
    if (item !== 'dokezo') throw new ApiError(400, 'Tumia dokezo')
    const known = new Set<number>(Object.keys(s.hints ?? {}).map(Number))
    ;(s.guesses ?? []).forEach(g => evaluate(g, r.seed).forEach((m, i) => m === 'correct' && known.add(i)))
    const open = [0, 1, 2, 3, 4].filter(i => !known.has(i))
    if (!open.length) throw new ApiError(400, 'Herufi zote zinajulikana')
    const index = open[Math.floor(Math.random() * open.length)]
    reveal = { index, letter: r.seed[index] }
  }
  if (r.game === 'windo' && Date.now() > windoDeadline(r) + 2000) throw new ApiError(400, 'Muda umeshaisha')
  const paidWith = await sql.begin(tx => consumeItem(tx, req.pid, item))
  const next = { ...s, helps: (s.helps ?? 0) + (item === 'bomu' ? 2 : item === 'dokezo' ? 1 : 0) }
  if (item === 'muda') next.extra = (s.extra ?? 0) + R.WINDO_EXTRA
  if (r.game === 'windo' && item === 'bomu') next.extra = (next.extra ?? 0) + 5 // the bomb freezes the clock 5s
  if (reveal) next.hints = { ...(s.hints ?? {}), [reveal.index]: reveal.letter }
  await saveState(r.id, next)
  res.json({ paidWith, reveal, run: view({ ...r, state: next }), me: await me(req.pid) })
}))

// ---- finish: the server re-derives the puzzle from the seed and scores it ----
games.post('/runs/:id/finish', h(async (req, res) => {
  const r = await getRun(req.pid, req.params.id)
  if (r.finished_at) return res.json({ result: result(r), me: await me(req.pid) })
  const helps = r.state.helps ?? 0

  if (r.game === 'windo') {
    if (r.duel_id && Date.now() < windoDeadline(r) - 1500) throw new ApiError(400, 'Vita bado inaendelea', 'duel_running')
    const out = await finishWindo(r, Array.isArray(req.body?.words) ? req.body.words : [])
    if (r.duel_id) await resolveDuelFor(r.duel_id)
    return res.json({ result: result(out.run, { ...out.extra, challenge: out.challenge }), me: await me(req.pid) })
  }

  if (r.game === 'mafumbo') {
    const cw = makeCrossword(rngFor(r.seed), 9)
    const entries = (req.body?.entries ?? {}) as Record<string, string>
    const solved = cw.words.every(w => [...w.word].every((ch, i) => entries[w.dir === 'A' ? `${w.r},${w.c + i}` : `${w.r + i},${w.c}`] === ch))
    if (!solved) throw new ApiError(400, 'Fumbo bado halijakamilika', 'not_solved')
    const secs = Math.round((Date.now() - r.started_at) / 1000)
    const score = R.mafumboScore(secs, helps)
    const out = await finishRun(r, true, score, R.mafumboReward(score))
    return res.json({ result: result(out.run, { secs, words: cw.words.length, challenge: out.challenge }), me: await me(req.pid) })
  }

  if (r.game === 'pangua') {
    const targets = panguaTargets(r.seed)
    const found = new Set((Array.isArray(req.body?.words) ? req.body.words : []).map((w: unknown) => String(w).toLowerCase()))
    if (!targets.every(t => found.has(t))) throw new ApiError(400, 'Bado kuna maneno', 'not_solved')
    const level = r.state.level ?? 1
    const out = await finishRun(r, true, R.panguaScore(targets, level, helps), R.panguaReward(targets.length))
    if (r.mode === 'level') await sql`UPDATE players SET pangua_level = GREATEST(pangua_level, ${level + 1}) WHERE id = ${req.pid}`
    return res.json({ result: result(out.run, { level, words: targets.length, challenge: out.challenge }), me: await me(req.pid) })
  }

  // Fumbua finishes through guessing; this lets a player give up (counts as a loss)
  const out = await finishRun(r, false, R.fumbuaScore(false, 6, false), R.fumbuaReward(false, 6))
  if (r.duel_id) await resolveDuelFor(r.duel_id)
  res.json({ result: result(out.run, { answer: r.seed }), me: await me(req.pid) })
}))

// ---- double the coins of a finished run after a watched rewarded ad ----
games.post('/runs/:id/double', h(async (req, res) => {
  const r = await getRun(req.pid, req.params.id)
  if (!r.finished_at || r.doubled || r.coins <= 0) throw new ApiError(400, 'Haiwezi kuzidishwa')
  await sql.begin(async tx => {
    const [v] = await tx<{ started_at: number }[]>`UPDATE ad_views SET claimed = true WHERE id = ${String(req.body?.adViewId)} AND player_id = ${req.pid} AND claimed = false RETURNING started_at`
    if (!v || Date.now() - v.started_at < 5000) throw new ApiError(400, 'Tazama tangazo lote kwanza', 'ad_not_watched')
    const [ok] = await tx`UPDATE runs SET doubled = true WHERE id = ${r.id} AND doubled = false RETURNING id`
    if (!ok) throw new ApiError(409, 'Tayari imezidishwa')
    await tx`UPDATE players SET coins = coins + ${r.coins} WHERE id = ${req.pid}`
  })
  res.json({ bonus: r.coins, me: await me(req.pid) })
}))
