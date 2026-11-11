import { Router } from 'express'
import crypto from 'node:crypto'
import { sql } from './db.js'
import { rateLimit, requireAdmin, requireCron, requirePlayer, signToken } from './auth.js'
import { ApiError, addItem, award, createPlayer, isPro, lockPlayer, me, mustPlayer, publicPlayer, serialize, spend } from './players.js'
import { games, h } from './games.js'
import { duels } from './duels.js'
import { challenges, publicChallenges } from './challenges.js'
import { assetUrl, assets, attachAsset, publicAssets } from './assets.js'
import { accounts, cleanName, nameTaken, publicAccounts } from './accounts.js'
import { paymentsInfo, refreshPayment, startPayment } from './payments.js'
import {
  AD_COLORS, AD_ICONS, AD_SLOTS, AVATARS, CHEST, COIN_PACKS, DAILY_BONUS, FRAMES, FrameId, GAME_IDS, ITEMS, LEAGUE_PRIZE_GEMS,
  REGIONS, REWARD_AD, THEMES, ThemeId, adPrice, levelFromXp,
} from '../src/shared/catalog.js'
import { dayKey, weekKey } from '../src/lib/rng.js'

/** A live campaign as the app sees it (file ids → URLs). */
const sponsorView = (r: any) => ({ id: r.id, slot: r.slot, brand: r.brand, line: r.line, cta: r.cta, link: r.link, icon: r.icon, color: r.color, image: assetUrl(r.image_id), pdf: assetUrl(r.pdf_id) })
const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)

export const api = Router()
api.use(rateLimit(240, 60_000, req => req.get('authorization') || req.ip || 'x'))

api.get('/health', (_req, res) => res.json({ ok: true, payments: paymentsInfo() }))

// ---------------- public ----------------
api.get('/stats', h(async (_req, res) => {
  const now = Date.now()
  const [s] = await sql<any[]>`SELECT
    (SELECT COUNT(*)::int FROM players WHERE last_seen > ${now - 120_000}) online,
    (SELECT COUNT(*)::int FROM players) players,
    (SELECT COUNT(*)::int FROM runs WHERE day = ${dayKey()} AND finished_at IS NOT NULL) games_today,
    (SELECT COUNT(*)::int FROM runs WHERE day = ${dayKey()} AND mode = 'daily' AND game = 'fumbua' AND won) solved_today,
    (SELECT COUNT(*)::int FROM duels WHERE status = 'live') duels_live`
  res.set('Cache-Control', 'public, max-age=20, s-maxage=20').json(s)
}))

api.get('/sponsors', h(async (_req, res) => {
  const now = Date.now()
  const rows = await sql<any[]>`SELECT id, slot, brand, line, cta, link, icon, color, image_id, pdf_id FROM ad_campaigns WHERE status = 'live' AND starts_at <= ${now} AND ends_at > ${now}`
  res.set('Cache-Control', 'public, max-age=60, s-maxage=60').json({ sponsors: rows.map(sponsorView) })
}))
api.post('/sponsors/:id/event', rateLimit(120, 60_000), h(async (req, res) => {
  const id = Number(req.params.id)
  if (req.body?.type === 'click') await sql`UPDATE ad_campaigns SET clicks = clicks + 1 WHERE id = ${id} AND status = 'live'`
  else await sql`UPDATE ad_campaigns SET impressions = impressions + 1 WHERE id = ${id} AND status = 'live'`
  res.json({ ok: true })
}))
api.use(publicChallenges)
api.use(publicAssets)
api.use(publicAccounts)

// ---------------- everything below needs a player ----------------
api.use(requirePlayer)
api.use((req, _res, next) => { sql`UPDATE players SET last_seen = ${Date.now()} WHERE id = ${req.pid}`.catch(() => {}); next() })
api.use(games)
api.use(duels)
api.use(challenges)
api.use(assets)
api.use(accounts)

api.get('/me', h(async (req, res) => res.json({ me: await me(req.pid), payments: paymentsInfo() })))

api.patch('/me', h(async (req, res) => {
  const p = await mustPlayer(req.pid)
  const b = req.body ?? {}
  const f: Record<string, unknown> = {}
  if (b.name !== undefined && b.name !== p.name) {
    const { name, key } = cleanName(b.name)
    if (await nameTaken(key, p.id)) throw new ApiError(409, 'Jina hilo limeshachukuliwa — jaribu jingine', 'name_taken')
    f.name = name; f.name_key = key
  }
  if ((AVATARS as readonly string[]).includes(b.avatar)) f.avatar = b.avatar
  if (REGIONS.includes(b.region)) f.region = b.region
  if (b.theme !== undefined) {
    if (!p.owned_themes.includes(b.theme) || !(b.theme in THEMES) || (THEMES[b.theme as ThemeId].pro && !isPro(p))) throw new ApiError(403, 'Hujafungua mandhari hii')
    f.theme = b.theme
  }
  if (b.frame !== undefined) {
    if (!p.owned_frames.includes(b.frame) || !(b.frame in FRAMES) || (FRAMES[b.frame as FrameId].pro && !isPro(p))) throw new ApiError(403, 'Hujafungua fremu hii')
    f.frame = b.frame
  }
  if (Object.keys(f).length) {
    try { await sql`UPDATE players SET ${sql(f)} WHERE id = ${p.id}` }
    catch (e: any) { if (e?.code === '23505') throw new ApiError(409, 'Jina hilo limeshachukuliwa — jaribu jingine', 'name_taken'); throw e }
  }
  res.json({ me: await me(p.id) })
}))

// ---------------- daily rewards ----------------
api.post('/daily/bonus', h(async (req, res) => {
  const today = dayKey()
  const { streak } = await serialize(await mustPlayer(req.pid))
  const coins = await sql.begin(async tx => {
    const p = await lockPlayer(tx, req.pid)
    if (p.last_bonus_day === today) throw new ApiError(409, 'Umeshapokea zawadi ya leo')
    await tx`UPDATE players SET last_bonus_day = ${today} WHERE id = ${p.id}`
    return award(tx, p, DAILY_BONUS(streak), 10)
  })
  res.json({ coins, me: await me(req.pid) })
}))
api.post('/daily/chest', h(async (req, res) => {
  const today = dayKey()
  const [{ n }] = await sql<{ n: number }[]>`SELECT COUNT(DISTINCT game)::int n FROM runs WHERE player_id = ${req.pid} AND day = ${today} AND finished_at IS NOT NULL`
  if (n < GAME_IDS.length) throw new ApiError(400, 'Cheza michezo yote 4 kwanza')
  const coins = await sql.begin(async tx => {
    const p = await lockPlayer(tx, req.pid)
    if (p.chest_day === today) throw new ApiError(409, 'Kasha limeshafunguliwa leo')
    await tx`UPDATE players SET chest_day = ${today}, gems = gems + ${CHEST.gems} WHERE id = ${p.id}`
    return award(tx, p, CHEST.coins, CHEST.xp)
  })
  res.json({ coins, gems: CHEST.gems, me: await me(req.pid) })
}))

// ---------------- rewarded ads ----------------
api.post('/ads/view', h(async (req, res) => {
  const now = Date.now()
  const [live] = await sql<any[]>`SELECT id, brand, line, cta, link, icon, color, image_id, pdf_id FROM ad_campaigns
    WHERE status = 'live' AND slot = 'reward' AND starts_at <= ${now} AND ends_at > ${now} ORDER BY random() LIMIT 1`
  const id = 'adv_' + crypto.randomBytes(9).toString('base64url')
  await sql`INSERT INTO ad_views (id, player_id, campaign_id, started_at) VALUES (${id}, ${req.pid}, ${live?.id ?? null}, ${now})`
  if (live) await sql`UPDATE ad_campaigns SET impressions = impressions + 1 WHERE id = ${live.id}`
  res.json({ adViewId: id, sponsor: live ? sponsorView(live) : null, minWatchMs: REWARD_AD.minWatchMs })
}))
api.post('/ads/claim', h(async (req, res) => {
  const today = dayKey()
  await sql.begin(async tx => {
    const p = await lockPlayer(tx, req.pid)
    const [v] = await tx<{ started_at: number }[]>`SELECT started_at FROM ad_views WHERE id = ${String(req.body?.adViewId)} AND player_id = ${p.id} AND claimed = false`
    if (!v || Date.now() - v.started_at < REWARD_AD.minWatchMs) throw new ApiError(400, 'Tazama tangazo lote kwanza', 'ad_not_watched')
    if (Date.now() - p.last_reward_ad < REWARD_AD.cooldownMs) throw new ApiError(429, 'Subiri kidogo kabla ya tangazo jingine')
    const count = p.reward_ads_day === today ? p.reward_ads_count : 0
    if (count >= REWARD_AD.dailyCap) throw new ApiError(429, 'Umefikia kikomo cha matangazo leo')
    await tx`UPDATE ad_views SET claimed = true WHERE id = ${String(req.body?.adViewId)}`
    await tx`UPDATE players SET last_reward_ad = ${Date.now()}, reward_ads_day = ${today}, reward_ads_count = ${count + 1}, coins = coins + ${REWARD_AD.coins} WHERE id = ${p.id}`
  })
  res.json({ coins: REWARD_AD.coins, me: await me(req.pid) })
}))

// ---------------- shop (soft currency) ----------------
api.post('/shop/buy', h(async (req, res) => {
  const sku = String(req.body?.sku || '')
  await sql.begin(async tx => {
    const p = await lockPlayer(tx, req.pid)
    const item = ITEMS.find(i => 'item:' + i.id === sku)
    const pack = COIN_PACKS.find(c => c.id === sku)
    if (item) { await spend(tx, p.id, item.price, item.cur); await addItem(tx, p.id, item.id, item.qty); return }
    if (pack) { await spend(tx, p.id, pack.gems, 'gems'); await tx`UPDATE players SET coins = coins + ${pack.coins} WHERE id = ${p.id}`; return }
    const [kind, id] = sku.split(':')
    if (kind === 'theme' || kind === 'frame') {
      const cat = (kind === 'theme' ? THEMES : FRAMES) as Record<string, { price: number; cur: 'coins' | 'gems'; pro: boolean }>
      const t = cat[id]
      if (!t || t.pro) throw new ApiError(400, 'Haipatikani dukani')
      const owned = kind === 'theme' ? p.owned_themes : p.owned_frames
      if (owned.includes(id)) throw new ApiError(409, 'Tayari unayo')
      await spend(tx, p.id, t.price, t.cur)
      if (kind === 'theme') await tx`UPDATE players SET owned_themes = ${tx.json([...owned, id])}, theme = ${id} WHERE id = ${p.id}`
      else await tx`UPDATE players SET owned_frames = ${tx.json([...owned, id])}, frame = ${id} WHERE id = ${p.id}`
      return
    }
    throw new ApiError(400, 'Bidhaa haipo')
  })
  res.json({ me: await me(req.pid) })
}))

// ---------------- real-money payments ----------------
api.post('/payments', rateLimit(10, 10 * 60_000, req => String(req.pid)), h(async (req, res) => {
  const product = String(req.body?.product || '')
  const meta = product === 'ad' ? { campaignId: Number(req.body?.campaignId) } : {}
  if (product === 'ad') {
    const [c] = await sql<{ player_id: number }[]>`SELECT player_id FROM ad_campaigns WHERE id = ${meta.campaignId}`
    if (!c || c.player_id !== req.pid) throw new ApiError(404, 'Tangazo halipo')
  }
  res.json({ payment: await startPayment(req.pid, product, String(req.body?.phone || ''), meta) })
}))
api.get('/payments/:id', h(async (req, res) => {
  const payment = await refreshPayment(req.pid, req.params.id)
  res.json({ payment, me: await me(req.pid) })
}))

// ---------------- advertisers ----------------
api.post('/ads', rateLimit(10, 60 * 60_000, req => String(req.pid)), h(async (req, res) => {
  const b = req.body ?? {}
  const slot = AD_SLOTS.find(s => s.id === b.slot)
  if (!slot) throw new ApiError(400, 'Chagua nafasi')
  const brand = clean(b.brand, 28), line = clean(b.line, 60), contact = clean(b.contact, 40)
  const days = Math.max(1, Math.min(30, Math.round(Number(b.days) || 0)))
  if (brand.length < 2) throw new ApiError(400, 'Andika jina la biashara')
  if (contact.length < 6) throw new ApiError(400, 'Weka namba ya simu au barua pepe ya mawasiliano')
  const link: string | null = clean(b.link, 120) || null
  if (link && !/^https:\/\/[^\s]+$/i.test(link)) throw new ApiError(400, 'Kiungo kianze na https://')
  const campaign = await sql.begin(async tx => {
    const [c] = await tx<any[]>`
      INSERT INTO ad_campaigns (player_id, slot, brand, line, cta, link, icon, color, contact, days, price_tzs, status, created_at)
      VALUES (${req.pid}, ${slot.id}, ${brand}, ${line || brand}, ${clean(b.cta, 14) || 'Tazama'}, ${link},
        ${(AD_ICONS as readonly string[]).includes(b.icon) ? b.icon : AD_ICONS[0]}, ${AD_COLORS.includes(b.color) ? b.color : AD_COLORS[0]},
        ${contact}, ${days}, ${adPrice(slot.id, days)}, 'awaiting_payment', ${Date.now()})
      RETURNING *`
    const imageId = await attachAsset(tx, req.pid, c.id, b.imageId, 'image')
    const pdfId = await attachAsset(tx, req.pid, c.id, b.pdfId, 'pdf')
    const [done] = await tx`UPDATE ad_campaigns SET image_id = ${imageId}, pdf_id = ${pdfId} WHERE id = ${c.id} RETURNING *`
    return done
  })
  res.json({ campaign })
}))
api.get('/ads/mine', h(async (req, res) => {
  const rows = await sql<any[]>`SELECT id, slot, brand, line, icon, color, image_id, pdf_id, days, price_tzs, status, review_note, starts_at, ends_at, impressions, clicks, created_at FROM ad_campaigns WHERE player_id = ${req.pid} ORDER BY id DESC LIMIT 20`
  res.json({ campaigns: rows.map(r => ({ ...r, image: assetUrl(r.image_id), pdf: assetUrl(r.pdf_id) })) })
}))

// ---------------- leaderboard ----------------
api.get('/leaderboard', h(async (req, res) => {
  const period = ['day', 'week', 'all'].includes(String(req.query.period)) ? String(req.query.period) : 'week'
  const game = GAME_IDS.includes(req.query.game as any) ? String(req.query.game) : null
  const region = REGIONS.includes(String(req.query.region)) ? String(req.query.region) : null
  const totals = sql`
    SELECT r.player_id pid, SUM(r.score)::int score FROM runs r JOIN players p ON p.id = r.player_id
    WHERE r.finished_at IS NOT NULL
      ${period === 'day' ? sql`AND r.day = ${dayKey()}` : period === 'week' ? sql`AND r.week = ${weekKey()}` : sql``}
      ${game ? sql`AND r.game = ${game}` : sql``}
      ${region ? sql`AND p.region = ${region}` : sql``}
    GROUP BY r.player_id`
  const rows = await sql<any[]>`SELECT t.pid, t.score, p.name, p.avatar, p.region, p.frame, p.xp, p.pro_until FROM (${totals}) t JOIN players p ON p.id = t.pid ORDER BY t.score DESC, t.pid ASC LIMIT 50`
  const [mine] = await sql<{ score: number }[]>`SELECT score FROM (${totals}) t WHERE pid = ${req.pid}`
  const my = mine?.score ?? 0
  const [{ ahead, players }] = await sql<{ ahead: number; players: number }[]>`SELECT COUNT(*) FILTER (WHERE score > ${my})::int ahead, COUNT(*)::int players FROM (${totals}) t`
  res.json({
    period, game, region, players, me: { score: my, rank: my > 0 ? ahead + 1 : null },
    rows: rows.map(r => ({ ...publicPlayer({ ...r, id: r.pid }), score: r.score, lvl: levelFromXp(r.xp), me: r.pid === req.pid })),
  })
}))

// ---------------- admin ----------------
export const admin = Router()
admin.use(requireAdmin)
admin.get('/overview', h(async (_req, res) => {
  const now = Date.now()
  const [k] = await sql<any[]>`SELECT
    (SELECT COUNT(*)::int FROM players) players,
    (SELECT COUNT(*)::int FROM players WHERE last_seen > ${now - 86400_000}) dau,
    (SELECT COUNT(*)::int FROM runs WHERE day = ${dayKey()} AND finished_at IS NOT NULL) runs_today,
    (SELECT COUNT(*)::int FROM duels WHERE created_at > ${now - 86400_000} AND status = 'done') duels_today,
    (SELECT COUNT(*)::int FROM challenges WHERE created_at > ${now - 86400_000}) challenges_today,
    (SELECT COUNT(*)::int FROM players WHERE pro_until > ${now}) pro`
  const revenue = await sql`SELECT product, COUNT(*)::int n, SUM(amount_tzs)::int tzs FROM payments WHERE status = 'paid' GROUP BY product`
  const campaigns = await sql`SELECT c.*, p.name player,
      (SELECT size FROM ad_assets WHERE id = c.image_id) image_size, (SELECT size FROM ad_assets WHERE id = c.pdf_id) pdf_size
    FROM ad_campaigns c JOIN players p ON p.id = c.player_id
    ORDER BY CASE c.status WHEN 'in_review' THEN 0 WHEN 'live' THEN 1 ELSE 2 END, c.id DESC LIMIT 100`
  res.json({ ...k, revenue, campaigns })
}))
// ---- players ----
const EAT_DAY = (col: string) => `to_char(to_timestamp((${col} + 10800000) / 1000.0) AT TIME ZONE 'UTC', 'YYYY-MM-DD')`
admin.get('/players', h(async (req, res) => {
  const q = clean(req.query.q, 30)
  const sorts: Record<string, string> = { recent: 'p.created_at DESC', active: 'p.last_seen DESC', xp: 'p.xp DESC', coins: 'p.coins DESC', games: 'games DESC', spent: 'spent DESC', duels: 'p.duel_wins DESC' }
  const order = sorts[String(req.query.sort)] ?? sorts.active
  const rows = await sql.unsafe(`
    SELECT p.id, p.name, p.avatar, p.region, p.coins, p.gems, p.xp, p.streak, p.best_streak, p.duel_wins, p.duel_played,
      p.pro_until, p.created_at, p.last_seen, p.pangua_level, (p.pass_hash IS NOT NULL) has_password,
      (SELECT COUNT(*)::int FROM runs r WHERE r.player_id = p.id AND r.finished_at IS NOT NULL) games,
      (SELECT COUNT(*)::int FROM runs r WHERE r.player_id = p.id AND r.finished_at IS NOT NULL AND r.won) wins,
      (SELECT COALESCE(SUM(score), 0)::int FROM runs r WHERE r.player_id = p.id AND r.finished_at IS NOT NULL) total_score,
      (SELECT COALESCE(SUM(amount_tzs), 0)::int FROM payments y WHERE y.player_id = p.id AND y.status = 'paid') spent
    FROM players p
    WHERE $1 = '' OR p.name ILIKE '%' || $1 || '%' OR p.region ILIKE '%' || $1 || '%'
    ORDER BY ${order} LIMIT 200`, [q])
  const [{ n }] = await sql<{ n: number }[]>`SELECT COUNT(*)::int n FROM players`
  res.json({ total: n, players: rows })
}))
admin.get('/players/:id', h(async (req, res) => {
  const id = Number(req.params.id)
  const [p] = await sql<any[]>`SELECT id, name, avatar, region, coins, gems, xp, streak, best_streak, duel_wins, duel_played, pro_until, created_at, last_seen,
    pangua_level, fumbua_dist, inv, (pass_hash IS NOT NULL) has_password FROM players WHERE id = ${id}`
  if (!p) throw new ApiError(404, 'not found')
  const [games, runs, payments, campaigns] = await Promise.all([
    sql`SELECT game, COUNT(*)::int played, COUNT(*) FILTER (WHERE won)::int won, MAX(score)::int best, ROUND(AVG(score))::int avg
        FROM runs WHERE player_id = ${id} AND finished_at IS NOT NULL GROUP BY game ORDER BY played DESC`,
    sql`SELECT game, mode, score, won, coins, finished_at FROM runs WHERE player_id = ${id} AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 15`,
    sql`SELECT product, amount_tzs, status, provider, created_at FROM payments WHERE player_id = ${id} ORDER BY created_at DESC LIMIT 15`,
    sql`SELECT id, brand, slot, status, price_tzs FROM ad_campaigns WHERE player_id = ${id} ORDER BY id DESC LIMIT 10`,
  ])
  res.json({ player: p, games, runs, payments, campaigns })
}))
/** Support: give a player who lost both password and recovery code a temporary password. */
admin.post('/players/:id/reset-password', h(async (req, res) => {
  const temp = Array.from(crypto.randomBytes(8), b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('')
  const { hashPassword } = await import('./accounts.js')
  const r = await sql`UPDATE players SET pass_hash = ${await hashPassword(temp)} WHERE id = ${Number(req.params.id)} RETURNING id`
  if (!r.count) throw new ApiError(404, 'not found')
  res.json({ tempPassword: temp })
}))

// ---- analytics (last 14 EAT days) ----
admin.get('/analytics', h(async (_req, res) => {
  const since = dayKey(new Date(Date.now() - 13 * 86400_000))
  const [signups, active, games, revenue, regions, perGame, duels, challenges] = await Promise.all([
    sql.unsafe(`SELECT ${EAT_DAY('created_at')} AS day, COUNT(*)::int n FROM players GROUP BY 1 HAVING ${EAT_DAY('created_at')} >= $1 ORDER BY 1`, [since]),
    sql`SELECT day, COUNT(DISTINCT player_id)::int n FROM runs WHERE finished_at IS NOT NULL AND day >= ${since} GROUP BY day ORDER BY day`,
    sql`SELECT day, game, COUNT(*)::int n FROM runs WHERE finished_at IS NOT NULL AND day >= ${since} GROUP BY day, game ORDER BY day`,
    sql.unsafe(`SELECT ${EAT_DAY('paid_at')} AS day, SUM(amount_tzs)::int tzs FROM payments WHERE status = 'paid' AND paid_at IS NOT NULL GROUP BY 1 HAVING ${EAT_DAY('paid_at')} >= $1 ORDER BY 1`, [since]),
    sql`SELECT region, COUNT(*)::int n FROM players GROUP BY region ORDER BY n DESC`,
    sql`SELECT game, COUNT(*)::int plays, COUNT(*) FILTER (WHERE won)::int wins, ROUND(AVG(score))::int avg_score, COUNT(DISTINCT player_id)::int players,
          COUNT(*) FILTER (WHERE mode = 'duel')::int duel_runs, COUNT(*) FILTER (WHERE mode = 'challenge')::int challenge_runs
        FROM runs WHERE finished_at IS NOT NULL GROUP BY game ORDER BY plays DESC`,
    sql`SELECT kind, COUNT(*)::int n, COUNT(*) FILTER (WHERE winner IS NULL)::int draws FROM duels WHERE status = 'done' GROUP BY kind`,
    sql`SELECT COUNT(*)::int created, (SELECT COUNT(*)::int FROM runs WHERE challenge_code IS NOT NULL AND finished_at IS NOT NULL) plays FROM challenges`,
  ])
  const days = Array.from({ length: 14 }, (_, i) => dayKey(new Date(Date.now() - (13 - i) * 86400_000)))
  res.json({ days, signups, active, games, revenue, regions, perGame, duels, challenges: challenges[0] })
}))

admin.post('/campaigns/:id/:action', h(async (req, res) => {
  const id = Number(req.params.id)
  const [c] = await sql<any[]>`SELECT * FROM ad_campaigns WHERE id = ${id}`
  if (!c) throw new ApiError(404, 'not found')
  const now = Date.now()
  if (req.params.action === 'approve') {
    if (c.status !== 'in_review') throw new ApiError(400, 'Only paid campaigns in review can go live')
    await sql`UPDATE ad_campaigns SET status = 'live', starts_at = ${now}, ends_at = ${now + c.days * 86400_000}, review_note = NULL WHERE id = ${id}`
  } else if (req.params.action === 'reject') {
    await sql`UPDATE ad_campaigns SET status = 'rejected', review_note = ${clean(req.body?.note, 140) || null} WHERE id = ${id}`
  } else if (req.params.action === 'end') {
    await sql`UPDATE ad_campaigns SET status = 'ended', ends_at = ${now} WHERE id = ${id}`
  } else throw new ApiError(400, 'unknown action')
  res.json({ ok: true })
}))

// ---------------- cron (Vercel Cron, daily 00:05 EAT): end campaigns, pay league winners ----------------
export const cron = Router()
cron.get('/housekeeping', requireCron, h(async (_req, res) => res.json(await housekeeping())))

export async function housekeeping() {
  const now = Date.now()
  await sql`UPDATE ad_campaigns SET status = 'ended' WHERE status = 'live' AND ends_at <= ${now}`
  // uploads that never made it into a campaign
  await sql`DELETE FROM ad_assets WHERE campaign_id IS NULL AND created_at < ${now - 86400_000}`
  await sql`UPDATE duels SET status = 'cancelled' WHERE status = 'waiting' AND created_at < ${now - 15 * 60_000}`
  const lastWeek = weekKey(new Date(now - 7 * 86400_000))
  const paid = await sql.begin(async tx => {
    const [done] = await tx`SELECT 1 FROM league_payouts WHERE week = ${lastWeek}`
    if (done) return []
    const top = await tx<{ pid: number; s: number }[]>`SELECT player_id pid, SUM(score)::int s FROM runs WHERE week = ${lastWeek} AND finished_at IS NOT NULL GROUP BY player_id ORDER BY s DESC LIMIT 3`
    await tx`INSERT INTO league_payouts (week, winners, paid_at) VALUES (${lastWeek}, ${tx.json(top as any)}, ${now})`
    for (const t of top) await tx`UPDATE players SET gems = gems + ${LEAGUE_PRIZE_GEMS} WHERE id = ${t.pid}`
    return top
  })
  return { week: lastWeek, paid: paid.length }
}
