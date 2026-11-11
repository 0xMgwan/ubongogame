// `npm run dev`: API (tsx watch) + Vite app, plus a local PGlite Postgres when DATABASE_URL isn't set.
import { spawn } from 'node:child_process'
import fs from 'node:fs'

const env = { ...process.env }
if (fs.existsSync('.env')) for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && m[2] && !(m[1] in env)) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const procs = []
const run = (cmd, args, extra = {}) => { const p = spawn(cmd, args, { stdio: 'inherit', env: { ...env, ...extra } }); procs.push(p); return p }
const stop = () => { procs.forEach(p => p.kill('SIGTERM')); process.exit() }
process.on('SIGINT', stop); process.on('SIGTERM', stop)

if (!env.DATABASE_URL) {
  const port = 54329
  env.DATABASE_URL = `postgres://postgres@127.0.0.1:${port}/postgres`
  run('node', ['scripts/dev-db.mjs'], { DEV_DB_PORT: String(port) })
  await new Promise(r => setTimeout(r, 2500))
}
run('npm', ['run', 'dev:api'])
run('npm', ['run', 'dev:web'])
procs.forEach(p => p.on('exit', code => { if (code) { console.error('[dev] a process exited with', code); stop() } }))
