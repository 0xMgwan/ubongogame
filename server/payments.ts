// Real-money payments (Kifalme, gem packs, ad campaigns).
//  - ntzs: mobile-money collection through the nTZS platform wallet (same integration as Bongo Life).
//          Deposits carry endUser.reference = ubg_<playerId>; money lands in your nTZS treasury.
//          Fulfilment happens on the signed `deposit.completed` webhook, with polling as fallback.
//  - demo: auto-confirms after ~6s. On in dev, OFF in production unless ALLOW_DEMO_PAYMENTS=true.
import crypto from 'node:crypto'
import { Tx, sql } from './db.js'
import { ApiError, lockPlayer, mustPlayer } from './players.js'
import { GEM_PACKS, PRO } from '../src/shared/catalog.js'

const NTZS_BASE = process.env.NTZS_BASE_URL || 'https://www.ntzs.co.tz'
const NTZS_KEY = process.env.NTZS_API_KEY
const NTZS_WEBHOOK_SECRET = process.env.NTZS_WEBHOOK_SECRET

const PAID = new Set(['fiat_confirmed', 'bank_approved', 'platform_approved', 'mint_pending', 'mint_requires_safe', 'mint_processing', 'minted', 'mint_failed', 'completed'])
const FAILED = new Set(['kyc_rejected', 'rejected', 'cancelled', 'failed', 'expired'])
type Status = 'pending' | 'paid' | 'failed'

type Provider = {
  id: string; livemode: boolean
  create(a: { amountTzs: number; phone: string; playerId: number; name: string }): Promise<{ ref: string; instructions: string | null }>
  check(ref: string): Promise<Status>
}

async function ntzsFetch(p: string, init: RequestInit = {}) {
  const res = await fetch(NTZS_BASE + p, {
    ...init,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${NTZS_KEY}`, ...(init.headers || {}) },
    signal: AbortSignal.timeout(20_000),
  })
  const body: any = await res.json().catch(() => ({}))
  if (!res.ok) {
    const code = body.code || body.error
    console.warn('[ntzs]', res.status, code, body.message || '')
    throw new ApiError(res.status >= 500 ? 502 : 400,
      code === 'invalid_phone' ? 'Namba ya simu si sahihi' : code === 'kyb_required' ? 'Malipo yamefikia kikomo kwa sasa. Jaribu baadaye.' : 'Malipo hayakuanza. Jaribu tena.', code)
  }
  return body
}

const ntzs: Provider = {
  id: 'ntzs', livemode: !!NTZS_KEY?.startsWith('ntzs_live_'),
  async create({ amountTzs, phone, playerId, name }) {
    const body = await ntzsFetch('/api/v1/deposits', {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ amountTzs, paymentMethod: 'mobile_money', phoneNumber: phone, endUser: { reference: `ubg_${playerId}`, name, phone } }),
    })
    const ins = typeof body.instructions === 'string' ? body.instructions : body.instructions?.note ?? null
    return { ref: String(body.id), instructions: ins ?? 'Thibitisha malipo kwenye simu yako (weka PIN).' }
  },
  async check(ref) {
    const body = await ntzsFetch(`/api/v1/deposits/${encodeURIComponent(ref)}`)
    return PAID.has(body.status) ? 'paid' : FAILED.has(body.status) ? 'failed' : 'pending'
  },
}

const demo: Provider = {
  id: 'demo', livemode: false,
  async create() { return { ref: `demo_${Date.now().toString(36)}`, instructions: 'Hali ya majaribio: malipo yatathibitishwa yenyewe baada ya sekunde chache.' } },
  async check(ref) { return Date.now() - parseInt(ref.slice(5), 36) > 6000 ? 'paid' : 'pending' },
}

const demoAllowed = process.env.ALLOW_DEMO_PAYMENTS ? process.env.ALLOW_DEMO_PAYMENTS === 'true' : process.env.NODE_ENV !== 'production' && !process.env.VERCEL_ENV?.startsWith('production')
export const provider: Provider | null = NTZS_KEY ? ntzs : demoAllowed ? demo : null
const providers: Record<string, Provider> = { ntzs, demo }

async function priceOf(product: string, meta: Record<string, any>): Promise<number> {
  if (product === PRO.id) return PRO.tzs
  const g = GEM_PACKS.find(x => x.id === product); if (g) return g.tzs
  if (product === 'ad') {
    const [c] = await sql<{ price_tzs: number; status: string }[]>`SELECT price_tzs, status FROM ad_campaigns WHERE id = ${meta.campaignId}`
    if (!c || c.status !== 'awaiting_payment') throw new ApiError(400, 'Tangazo hili haliwezi kulipiwa')
    return c.price_tzs
  }
  throw new ApiError(400, 'Bidhaa haipo')
}

async function fulfil(tx: Tx, pay: { player_id: number; product: string; meta: any }) {
  const p = await lockPlayer(tx, pay.player_id)
  if (pay.product === PRO.id) {
    const until = Math.max(Date.now(), p.pro_until) + PRO.days * 86400_000
    const themes = [...new Set([...p.owned_themes, 'dhahabu'])], frames = [...new Set([...p.owned_frames, 'kifalme'])]
    await tx`UPDATE players SET pro_until = ${until}, owned_themes = ${tx.json(themes)}, owned_frames = ${tx.json(frames)}, theme = 'dhahabu', frame = 'kifalme' WHERE id = ${p.id}`
  } else if (pay.product.startsWith('gems_')) {
    const g = GEM_PACKS.find(x => x.id === pay.product)!
    await tx`UPDATE players SET gems = gems + ${g.gems} WHERE id = ${p.id}`
  } else if (pay.product === 'ad') {
    await tx`UPDATE ad_campaigns SET status = 'in_review' WHERE id = ${pay.meta.campaignId} AND status = 'awaiting_payment'`
  }
}

/** Move a payment to paid/failed exactly once; fulfils on the first transition to paid. */
export async function applyStatus(id: string, status: Status) {
  if (status === 'pending') return
  await sql.begin(async tx => {
    const [pay] = await tx`UPDATE payments SET status = ${status}, paid_at = ${status === 'paid' ? Date.now() : null}
      WHERE id = ${id} AND status = 'pending' RETURNING player_id, product, meta`
    if (pay && status === 'paid') await fulfil(tx, pay as any)
  })
}

export function normalizePhone(raw: string) {
  const d = String(raw || '').replace(/\D/g, '')
  const n = d.startsWith('255') ? d : d.startsWith('0') ? '255' + d.slice(1) : d.length === 9 ? '255' + d : d
  if (!/^255[67]\d{8}$/.test(n)) throw new ApiError(400, 'Namba ya simu si sahihi (mf. 0712 345 678)', 'invalid_phone')
  return n
}

export async function startPayment(playerId: number, product: string, phoneRaw: string, meta: Record<string, any> = {}) {
  if (!provider) throw new ApiError(503, 'Malipo hayajawashwa bado', 'payments_off')
  const p = await mustPlayer(playerId)
  const phone = normalizePhone(phoneRaw)
  const amount = await priceOf(product, meta)
  const id = 'pay_' + crypto.randomBytes(9).toString('base64url')
  const { ref, instructions } = await provider.create({ amountTzs: amount, phone, playerId, name: p.name })
  await sql`INSERT INTO payments (id, player_id, product, amount_tzs, provider, provider_ref, status, meta, created_at)
    VALUES (${id}, ${playerId}, ${product}, ${amount}, ${provider.id}, ${ref}, 'pending', ${sql.json(meta)}, ${Date.now()})`
  if (product === 'ad') await sql`UPDATE ad_campaigns SET payment_id = ${id} WHERE id = ${meta.campaignId}`
  return { id, status: 'pending' as const, amount, instructions, provider: provider.id, livemode: provider.livemode }
}

export async function refreshPayment(playerId: number, id: string) {
  const [pay] = await sql<any[]>`SELECT * FROM payments WHERE id = ${id} AND player_id = ${playerId}`
  if (!pay) throw new ApiError(404, 'Malipo hayapo')
  if (pay.status === 'pending') {
    if (Date.now() - pay.created_at > 30 * 60_000) await applyStatus(id, 'failed')
    else await applyStatus(id, await providers[pay.provider].check(pay.provider_ref).catch(() => 'pending' as const))
  }
  const [fresh] = await sql<{ id: string; product: string; amount: number; status: string }[]>`SELECT id, product, amount_tzs amount, status FROM payments WHERE id = ${id}`
  return fresh
}

/** HMAC-SHA256 over `${timestamp}.${rawBody}`, hex. Rejects stale deliveries. */
export function verifyNtzsWebhook(rawBody: string, signature?: string, timestamp?: string) {
  if (!NTZS_WEBHOOK_SECRET || !signature || !timestamp) return false
  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) return false
  const ms = ts < 1e12 ? ts * 1000 : ts
  if (Math.abs(Date.now() - ms) > 10 * 60_000) return false
  const expected = crypto.createHmac('sha256', NTZS_WEBHOOK_SECRET).update(`${timestamp}.${rawBody}`).digest('hex')
  const a = Buffer.from(expected), b = Buffer.from(String(signature).replace(/^sha256=/, ''))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function onNtzsDepositCompleted(depositId: string) {
  const [pay] = await sql<{ id: string }[]>`SELECT id FROM payments WHERE provider = 'ntzs' AND provider_ref = ${depositId}`
  if (pay) await applyStatus(pay.id, 'paid')
  else console.warn('[webhook] unknown deposit', depositId)
}

export const paymentsInfo = () => ({ enabled: !!provider, provider: provider?.id ?? null, livemode: provider?.livemode ?? false })
