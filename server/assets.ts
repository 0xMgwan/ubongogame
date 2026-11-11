// Ad creatives: an optional picture (shown in the ad) and an optional PDF flyer (opened on tap).
// Stored in Postgres (bytea) so there is no extra storage service to configure on Vercel.
// Vercel caps request bodies at ~4.5 MB, so uploads are limited to 3 MB; the app shrinks pictures first.
import express, { Router } from 'express'
import crypto from 'node:crypto'
import { Tx, sql } from './db.js'
import { ApiError } from './players.js'
import { h } from './games.js'
import { rateLimit } from './auth.js'

export const MAX_ASSET_BYTES = 3 * 1024 * 1024
type Kind = 'image' | 'pdf'

/** Trust the file's bytes, not the browser's Content-Type. */
function sniff(b: Buffer): { kind: Kind; mime: string } | null {
  if (b.length > 8 && b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') return { kind: 'image', mime: 'image/png' }
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { kind: 'image', mime: 'image/jpeg' }
  if (b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return { kind: 'image', mime: 'image/webp' }
  if (b.length > 5 && b.toString('ascii', 0, 5) === '%PDF-') return { kind: 'pdf', mime: 'application/pdf' }
  return null
}

export const assetUrl = (id: string | null | undefined) => (id ? `/api/assets/${id}` : null)

/** Public: serve a stored file. Ids are random and files never change, so cache hard. */
export const publicAssets = Router()
publicAssets.get('/assets/:id', h(async (req, res) => {
  const [a] = await sql<{ mime: string; data: Buffer; kind: Kind }[]>`SELECT mime, data, kind FROM ad_assets WHERE id = ${req.params.id}`
  if (!a) throw new ApiError(404, 'Faili halipo')
  res.set({
    'Content-Type': a.mime,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': a.kind === 'pdf' ? 'inline; filename="ubongo-tangazo.pdf"' : 'inline',
    // pictures can't run anything; PDFs keep the browser's own viewer
    ...(a.kind === 'image' ? { 'Content-Security-Policy': "default-src 'none'; sandbox" } : {}),
  })
  res.send(a.data)
}))

/** Signed-in: upload one file (raw body). Returns its id to attach to a campaign. */
export const assets = Router()
assets.post('/ads/assets', rateLimit(20, 60 * 60_000, req => String(req.pid)),
  express.raw({ type: () => true, limit: MAX_ASSET_BYTES }),
  h(async (req, res) => {
    const body = req.body as Buffer
    if (!Buffer.isBuffer(body) || !body.length) throw new ApiError(400, 'Faili ni tupu')
    if (body.length > MAX_ASSET_BYTES) throw new ApiError(413, 'Faili ni kubwa mno (zaidi ya MB 3)')
    const t = sniff(body)
    if (!t) throw new ApiError(415, 'Tumia picha (JPG, PNG, WEBP) au PDF', 'bad_file')
    const id = 'ast_' + crypto.randomBytes(16).toString('base64url')
    await sql`INSERT INTO ad_assets (id, player_id, kind, mime, size, data, created_at) VALUES (${id}, ${req.pid}, ${t.kind}, ${t.mime}, ${body.length}, ${body}, ${Date.now()})`
    res.json({ id, kind: t.kind, size: body.length, url: assetUrl(id) })
  }))

/** Attach an uploaded file to a new campaign; it must be the player's own, unused, and the right kind. */
export async function attachAsset(tx: Tx, playerId: number, campaignId: number, id: unknown, kind: Kind) {
  if (!id) return null
  const [a] = await tx<{ id: string }[]>`
    UPDATE ad_assets SET campaign_id = ${campaignId}
    WHERE id = ${String(id)} AND player_id = ${playerId} AND kind = ${kind} AND campaign_id IS NULL RETURNING id`
  if (!a) throw new ApiError(400, kind === 'image' ? 'Picha haikupatikana — ipakie tena' : 'PDF haikupatikana — ipakie tena')
  return a.id
}
