// The Express app — served by Vercel (api/index.ts) and by server/local.ts in dev.
import express, { NextFunction, Request, Response } from 'express'
import { ensureSchema } from './db.js'
import { ApiError } from './players.js'
import { admin, api, cron } from './api.js'
import { onNtzsDepositCompleted, verifyNtzsWebhook } from './payments.js'

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)

// tables are created on the first request of a cold start
app.use((_req, _res, next) => { ensureSchema().then(() => next(), next) })

// nTZS webhooks need the raw body for signature verification, so they come before express.json.
app.post('/api/webhooks/ntzs', express.raw({ type: '*/*', limit: '100kb' }), async (req, res, next) => {
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
    if (!verifyNtzsWebhook(raw, req.get('x-webhook-signature'), req.get('x-webhook-timestamp'))) return res.status(400).json({ error: 'invalid signature' })
    const event = JSON.parse(raw)
    if (event.type === 'deposit.completed' && event.data?.depositId) await onNtzsDepositCompleted(String(event.data.depositId))
    res.json({ received: true })
  } catch (e) { next(e) }
})

app.use(express.json({ limit: '50kb' }))
app.use('/api/cron', cron)
app.use('/api/admin', admin)
app.use('/api', api)

app.use((_req, res) => res.status(404).json({ error: 'Haipo', code: 'not_found' }))
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) return res.status(err.status).json({ error: err.message, code: err.code })
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON si sahihi' })
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Faili ni kubwa mno (zaidi ya MB 3)', code: 'too_large' })
  console.error(err)
  res.status(500).json({ error: 'Hitilafu ya seva. Jaribu tena.' })
})

export default app
