// Dev / self-hosted entry: the same app, plus the built client if present.
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import app from './app.js'
import { paymentsInfo } from './payments.js'

const dist = path.resolve(import.meta.dirname, '../dist')
const host = express()
host.use(app)
if (fs.existsSync(dist)) {
  host.use('/assets', express.static(path.join(dist, 'assets'), { maxAge: '365d', immutable: true }))
  host.use(express.static(dist, { maxAge: '1h', extensions: ['html'] }))
  host.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}
const PORT = Number(process.env.PORT) || 8790
host.listen(PORT, () => console.log(`[ubongo] api on :${PORT} · payments: ${JSON.stringify(paymentsInfo())}`))
