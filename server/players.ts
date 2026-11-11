import crypto from 'node:crypto'
import { Db, Tx, sql } from './db.js'
import { FRAMES, GAME_IDS, GameId, ITEM_SINGLE_PRICE, Item, PRO, STARTER, THEMES } from '../src/shared/catalog.js'
import { dayIndex, dayKey, weekDays, weekKey } from '../src/lib/rng.js'

export class ApiError extends Error {
  constructor(public status: number, msg: string, public code?: string) { super(msg) }
}

export type PlayerRow = {
  id: number; name: string; avatar: string; region: string
  coins: number; gems: number; xp: number; pro_until: number
  inv: Record<Item, number>; theme: string; frame: string; owned_themes: string[]; owned_frames: string[]
  streak: number; best_streak: number; last_play_day: string | null; last_bonus_day: string | null; chest_day: string | null
  pro_hint_day: string | null; last_reward_ad: number; reward_ads_day: string | null; reward_ads_count: number
  fumbua_dist: number[]; pangua_level: number; duel_wins: number; duel_played: number
  recovery_code: string; created_at: number; last_seen: number; name_key: string | null; pass_hash: string | null
}

export async function getPlayer(id: number, db: Db = sql) {
  const [p] = await db<PlayerRow[]>`SELECT * FROM players WHERE id = ${id}`
  return p
}
export async function mustPlayer(id: number, db: Db = sql) {
  const p = await getPlayer(id, db)
  if (!p) throw new ApiError(401, 'Akaunti haipo', 'no_player')
  return p
}
/** Row-locks the player for the rest of a transaction (wallet changes). */
export async function lockPlayer(tx: Tx, id: number) {
  const [p] = await tx<PlayerRow[]>`SELECT * FROM players WHERE id = ${id} FOR UPDATE`
  if (!p) throw new ApiError(401, 'Akaunti haipo', 'no_player')
  return p
}
export const isPro = (p: PlayerRow) => p.pro_until > Date.now()

function recoveryCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const part = () => Array.from(crypto.randomBytes(4), b => A[b % A.length]).join('')
  return `UBG-${part()}-${part()}`
}

export async function createPlayer(name: string, avatar: string, region: string, nameKey: string, passHash: string) {
  const now = Date.now()
  const [p] = await sql<PlayerRow[]>`
    INSERT INTO players (name, name_key, pass_hash, avatar, region, coins, gems, inv, recovery_code, created_at, last_seen)
    VALUES (${name}, ${nameKey}, ${passHash}, ${avatar}, ${region}, ${STARTER.coins}, ${STARTER.gems}, ${sql.json(STARTER.inv)}, ${recoveryCode()}, ${now}, ${now})
    RETURNING *`
  return p
}

/** Coins/xp reward with the Kifalme ×2 coin multiplier. Returns coins actually paid. */
export async function award(db: Db, p: PlayerRow, coins: number, xp = 0) {
  const paid = Math.round(coins * (isPro(p) ? 2 : 1))
  await db`UPDATE players SET coins = coins + ${paid}, xp = xp + ${xp} WHERE id = ${p.id}`
  return paid
}

export async function spend(db: Db, id: number, amount: number, cur: 'coins' | 'gems') {
  const r = await db`UPDATE players SET ${db(cur)} = ${db(cur)} - ${amount} WHERE id = ${id} AND ${db(cur)} >= ${amount}`
  if (!r.count) throw new ApiError(402, cur === 'gems' ? 'Almasi hazitoshi' : 'Sarafu hazitoshi', 'insufficient_funds')
}

export async function addItem(db: Db, id: number, it: Item, n: number) {
  const [p] = await db<{ inv: Record<Item, number> }[]>`SELECT inv FROM players WHERE id = ${id} FOR UPDATE`
  const inv = { ...p.inv, [it]: (p.inv[it] || 0) + n }
  await db`UPDATE players SET inv = ${db.json(inv)} WHERE id = ${id}`
}

/** Use one of an item; if none left, buy-and-use for ITEM_SINGLE_PRICE coins. Kifalme gets free daily hints. */
export async function consumeItem(tx: Tx, id: number, it: Item): Promise<'item' | 'coins'> {
  const p = await lockPlayer(tx, id)
  const inv = { ...p.inv }
  const today = dayKey()
  if (it === 'dokezo' && isPro(p) && p.pro_hint_day !== today) {
    inv.dokezo = (inv.dokezo || 0) + PRO.dailyHints
    await tx`UPDATE players SET pro_hint_day = ${today} WHERE id = ${id}`
  }
  if ((inv[it] || 0) > 0) {
    inv[it]--
    await tx`UPDATE players SET inv = ${tx.json(inv)} WHERE id = ${id}`
    return 'item'
  }
  const price = ITEM_SINGLE_PRICE[it]
  if (!price) throw new ApiError(402, 'Huna kifaa hiki', 'no_item')
  await tx`UPDATE players SET inv = ${tx.json(inv)} WHERE id = ${id}`
  await spend(tx, id, price, 'coins')
  return 'coins'
}

/** When a run finishes: bump the daily streak, spending a Kinga if exactly one day was missed. */
export async function touchStreak(tx: Tx, id: number) {
  const p = await lockPlayer(tx, id)
  const today = dayKey()
  if (p.last_play_day === today) return
  let { streak } = p
  const inv = { ...p.inv }
  const gap = p.last_play_day ? dayIndex() - dayIndex(new Date(p.last_play_day + 'T12:00:00')) : 1
  if (gap === 1) streak += 1
  else if (gap === 2 && (inv.kinga || 0) > 0) { streak += 1; inv.kinga-- }
  else streak = 1
  await tx`UPDATE players SET streak = ${streak}, best_streak = ${Math.max(p.best_streak, streak)}, last_play_day = ${today}, inv = ${tx.json(inv)} WHERE id = ${id}`
}

/** The player as the app sees it. */
export async function serialize(p: PlayerRow) {
  const pro = isPro(p)
  let theme = p.theme, frame = p.frame
  if (!(theme in THEMES) || (!pro && THEMES[theme as keyof typeof THEMES].pro)) theme = 'karatasi'
  if (!(frame in FRAMES) || (!pro && FRAMES[frame as keyof typeof FRAMES].pro)) frame = 'none'
  const today = dayKey()
  const [days, games, [w]] = await Promise.all([
    sql<{ day: string; game: GameId; s: number }[]>`
      SELECT day, game, MAX(score)::int s FROM runs WHERE player_id = ${p.id} AND finished_at IS NOT NULL AND day >= ${weekDays()[0]} GROUP BY day, game`,
    sql<{ game: GameId; played: number; won: number; best: number }[]>`
      SELECT game, COUNT(*)::int played, COUNT(*) FILTER (WHERE won)::int won, MAX(score)::int best FROM runs WHERE player_id = ${p.id} AND finished_at IS NOT NULL GROUP BY game`,
    sql<{ s: number }[]>`SELECT COALESCE(SUM(score),0)::int s FROM runs WHERE player_id = ${p.id} AND finished_at IS NOT NULL AND week = ${weekKey()}`,
  ])
  const daily: Record<string, Partial<Record<GameId, number>>> = {}
  days.forEach(r => ((daily[r.day] ??= {})[r.game] = r.s))
  const stats = Object.fromEntries(GAME_IDS.map(g => [g, { played: 0, won: 0, best: 0 }])) as Record<GameId, { played: number; won: number; best: number }>
  games.forEach(r => (stats[r.game] = { played: r.played, won: r.won, best: r.best }))
  const gap = p.last_play_day ? dayIndex() - dayIndex(new Date(p.last_play_day + 'T12:00:00')) : 0
  return {
    id: p.id, name: p.name, avatar: p.avatar, region: p.region,
    coins: p.coins, gems: p.gems, xp: p.xp,
    pro, proUntil: p.pro_until,
    inv: p.inv, theme, frame, ownedThemes: p.owned_themes, ownedFrames: p.owned_frames,
    streak: gap > 2 || (gap === 2 && !(p.inv.kinga > 0)) ? 0 : p.streak,
    bestStreak: p.best_streak, lastPlayDay: p.last_play_day,
    lastBonusDay: p.last_bonus_day, chestDay: p.chest_day, lastRewardAd: p.last_reward_ad,
    fumbuaDist: p.fumbua_dist, panguaLevel: p.pangua_level,
    duelWins: p.duel_wins, duelPlayed: p.duel_played,
    recoveryCode: p.recovery_code, hasPassword: !!p.pass_hash,
    daily, stats, weekly: w.s, today, dayIndex: dayIndex(), week: weekKey(),
  }
}
export type Me = Awaited<ReturnType<typeof serialize>>
export const me = async (id: number) => serialize(await mustPlayer(id))
export const publicPlayer = (p: Pick<PlayerRow, 'id' | 'name' | 'avatar' | 'frame' | 'pro_until' | 'region'>) => {
  const pro = p.pro_until > Date.now()
  return { id: p.id, name: p.name, avatar: p.avatar, region: p.region, pro, frame: !pro && FRAMES[p.frame as keyof typeof FRAMES]?.pro ? 'none' : p.frame }
}
