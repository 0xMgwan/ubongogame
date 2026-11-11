// Local Postgres for dev: PGlite (Postgres compiled to WASM) behind a wire-protocol socket.
// Data persists in ./data/pg. Production uses Neon via DATABASE_URL instead.
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import fs from 'node:fs'

const port = Number(process.env.DEV_DB_PORT) || 54329
fs.mkdirSync('data', { recursive: true })
const db = await PGlite.create('./data/pg')
const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1' })
await server.start()
console.log(`[dev-db] PGlite listening on postgres://postgres@127.0.0.1:${port}/postgres`)
const stop = async () => { await server.stop(); await db.close(); process.exit(0) }
process.on('SIGINT', stop); process.on('SIGTERM', stop)
