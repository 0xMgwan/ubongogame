import type { NextFunction, Request, Response } from 'express'
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { ApiError } from './players.js'

const PROD = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
const SECRET = process.env.JWT_SECRET || (PROD ? '' : 'ubongo-dev-secret-change-me')
if (!SECRET) throw new Error('JWT_SECRET is required in production')

export const ADMIN_KEY = process.env.ADMIN_KEY || (PROD ? '' : 'dev-admin')

export const signToken = (playerId: number) => jwt.sign({ pid: playerId }, SECRET, { expiresIn: '365d' })

declare global { namespace Express { interface Request { pid: number } } }

export function requirePlayer(req: Request, _res: Response, next: NextFunction) {
  const h = req.get('authorization') || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : ''
  try {
    const p = jwt.verify(token, SECRET) as { pid: number }
    req.pid = p.pid
    next()
  } catch {
    next(new ApiError(401, 'Ingia tena', 'unauthorized'))
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const k = req.get('x-admin-key') || ''
  const ok = ADMIN_KEY && k.length === ADMIN_KEY.length && crypto.timingSafeEqual(Buffer.from(k), Buffer.from(ADMIN_KEY))
  next(ok ? undefined : new ApiError(403, 'forbidden', 'forbidden'))
}

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. */
export function requireCron(req: Request, _res: Response, next: NextFunction) {
  const secret = process.env.CRON_SECRET || (PROD ? '' : 'dev-cron')
  const ok = secret && req.get('authorization') === `Bearer ${secret}`
  next(ok ? undefined : new ApiError(403, 'forbidden', 'forbidden'))
}

/** Tiny fixed-window rate limiter (per key per window). On Vercel it's per warm instance — a speed bump, not a wall. */
export function rateLimit(max: number, windowMs: number, keyFn: (req: Request) => string = req => req.ip || 'x') {
  const hits = new Map<string, { n: number; reset: number }>()
  return (req: Request, _res: Response, next: NextFunction) => {
    const k = keyFn(req), now = Date.now()
    if (hits.size > 5000) hits.forEach((v, key) => v.reset < now && hits.delete(key))
    const h = hits.get(k)
    if (!h || h.reset < now) { hits.set(k, { n: 1, reset: now + windowMs }); return next() }
    if (++h.n > max) return next(new ApiError(429, 'Polepole! Jaribu tena baada ya muda mfupi', 'rate_limited'))
    next()
  }
}
