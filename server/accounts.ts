// Accounts: unique player names + passwords, with the recovery code as the "forgot password" key.
// No email or phone is collected, so a reset needs the name + recovery code (shown in the profile).
import { Router } from 'express'
import crypto from 'node:crypto'
import { promisify } from 'node:util'
import { sql } from './db.js'
import { ApiError, createPlayer, me, mustPlayer, serialize } from './players.js'
import { rateLimit, signToken } from './auth.js'
import { h } from './games.js'
import { AVATARS, REGIONS } from '../src/shared/catalog.js'

const scrypt = promisify(crypto.scrypt) as (pw: string, salt: Buffer, len: number, opts: crypto.ScryptOptions) => Promise<Buffer>
const KEYLEN = 32, OPTS = { N: 16384, r: 8, p: 1 }
export const MIN_PASSWORD = 6

export async function hashPassword(pw: string) {
  const salt = crypto.randomBytes(16)
  const key = await scrypt(pw, salt, KEYLEN, OPTS)
  return `s1$${salt.toString('base64')}$${key.toString('base64')}`
}
export async function verifyPassword(pw: string, stored: string | null) {
  if (!stored) return false
  const [v, s, k] = stored.split('$')
  if (v !== 's1' || !s || !k) return false
  const key = await scrypt(pw, Buffer.from(s, 'base64'), KEYLEN, OPTS)
  const want = Buffer.from(k, 'base64')
  return key.length === want.length && crypto.timingSafeEqual(key, want)
}

/** Display name rules: 3–16 chars, letters/digits/space/_ . - ; "Neema" and "neema " are the same name. */
export function cleanName(raw: unknown) {
  const name = String(raw ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, 16)
  if (name.length < 3) throw new ApiError(400, 'Jina liwe na herufi 3 au zaidi', 'bad_name')
  if (!/^[\p{L}\p{N} _.\-]+$/u.test(name)) throw new ApiError(400, 'Tumia herufi, namba, nafasi, _ . au - tu', 'bad_name')
  return { name, key: name.toLowerCase().replace(/[\s_.\-]+/g, '') }
}
function checkPassword(raw: unknown) {
  const pw = String(raw ?? '')
  if (pw.length < MIN_PASSWORD) throw new ApiError(400, `Nenosiri liwe na herufi ${MIN_PASSWORD} au zaidi`, 'weak_password')
  if (pw.length > 128) throw new ApiError(400, 'Nenosiri ni refu mno', 'weak_password')
  return pw
}
export async function nameTaken(key: string, exceptId = 0) {
  const [r] = await sql`SELECT 1 FROM players WHERE name_key = ${key} AND id <> ${exceptId}`
  return !!r
}

// ---------------- public ----------------
export const publicAccounts = Router()

publicAccounts.get('/auth/name', rateLimit(60, 60_000), h(async (req, res) => {
  try {
    const { key } = cleanName(req.query.name)
    res.json({ valid: true, available: !(await nameTaken(key)) })
  } catch (e: any) { res.json({ valid: false, available: false, error: e.message }) }
}))

publicAccounts.post('/auth/register', rateLimit(8, 60 * 60_000), h(async (req, res) => {
  const { name, key } = cleanName(req.body?.name)
  const pw = checkPassword(req.body?.password)
  if (await nameTaken(key)) throw new ApiError(409, 'Jina hilo limeshachukuliwa — jaribu jingine', 'name_taken')
  const avatar = (AVATARS as readonly string[]).includes(req.body?.avatar) ? req.body.avatar : AVATARS[0]
  const region = REGIONS.includes(req.body?.region) ? req.body.region : REGIONS[0]
  let p
  try { p = await createPlayer(name, avatar, region, key, await hashPassword(pw)) }
  catch (e: any) { if (e?.code === '23505') throw new ApiError(409, 'Jina hilo limeshachukuliwa — jaribu jingine', 'name_taken'); throw e }
  res.json({ token: signToken(p.id), me: await serialize(p) })
}))

// keyed by IP + name so one player can't be locked out by someone else's guesses from elsewhere
const loginLimit = rateLimit(10, 15 * 60_000, req => `${req.ip}|${String(req.body?.name ?? '').toLowerCase()}`)

publicAccounts.post('/auth/login', loginLimit, h(async (req, res) => {
  let key = ''
  try { key = cleanName(req.body?.name).key } catch { /* fall through to the generic error */ }
  const [p] = key ? await sql<{ id: number; pass_hash: string | null }[]>`SELECT id, pass_hash FROM players WHERE name_key = ${key}` : []
  // same answer whether the name exists or not
  if (!p || !(await verifyPassword(String(req.body?.password ?? ''), p.pass_hash))) throw new ApiError(401, 'Jina au nenosiri si sahihi', 'bad_login')
  res.json({ token: signToken(p.id), me: await me(p.id) })
}))

/** Forgot password: name + recovery code → new password. */
publicAccounts.post('/auth/reset', loginLimit, h(async (req, res) => {
  let key = ''
  try { key = cleanName(req.body?.name).key } catch { /* generic error below */ }
  const code = String(req.body?.code ?? '').toUpperCase().replace(/\s/g, '')
  const pw = checkPassword(req.body?.password)
  const [p] = key ? await sql<{ id: number; recovery_code: string }[]>`SELECT id, recovery_code FROM players WHERE name_key = ${key}` : []
  const ok = p && code.length === p.recovery_code.length && crypto.timingSafeEqual(Buffer.from(code), Buffer.from(p.recovery_code))
  if (!ok) throw new ApiError(401, 'Jina au msimbo wa kurejesha si sahihi', 'bad_reset')
  await sql`UPDATE players SET pass_hash = ${await hashPassword(pw)} WHERE id = ${p.id}`
  res.json({ token: signToken(p.id), me: await me(p.id) })
}))

/** Sign in with the recovery code alone (kept from v1 — handy when changing phones). */
publicAccounts.post('/auth/restore', rateLimit(10, 15 * 60_000), h(async (req, res) => {
  const code = String(req.body?.code ?? '').toUpperCase().replace(/\s/g, '').slice(0, 20)
  const [p] = await sql<{ id: number }[]>`SELECT id FROM players WHERE recovery_code = ${code}`
  if (!p) throw new ApiError(404, 'Msimbo huo haupo')
  res.json({ token: signToken(p.id), me: await me(p.id) })
}))

// ---------------- signed in ----------------
export const accounts = Router()

/** Change (or set, for older accounts without one) the password. */
accounts.post('/me/password', rateLimit(10, 15 * 60_000, req => String(req.pid)), h(async (req, res) => {
  const p = await mustPlayer(req.pid)
  const [row] = await sql<{ pass_hash: string | null }[]>`SELECT pass_hash FROM players WHERE id = ${p.id}`
  if (row.pass_hash && !(await verifyPassword(String(req.body?.current ?? ''), row.pass_hash))) throw new ApiError(401, 'Nenosiri la sasa si sahihi', 'bad_password')
  const pw = checkPassword(req.body?.password)
  await sql`UPDATE players SET pass_hash = ${await hashPassword(pw)} WHERE id = ${p.id}`
  res.json({ ok: true, me: await me(p.id) })
}))
