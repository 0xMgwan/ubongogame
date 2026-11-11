// Renders the PNG app icons + link-preview image from SVG.
// One-off tool (not a project dependency):  npm i --no-save @resvg/resvg-js && node scripts/make-icons.mjs
import { Resvg } from '@resvg/resvg-js'
import fs from 'node:fs'

const INK = '#141414', GOLD = '#f5b800', GREEN = '#12805c', PAPER = '#fffdf8', RED = '#e5452b', BG = '#f6f1e6'
// the 2x2 tile mark from icon.svg, drawn inside a box of `size` at (x, y); the "U" is a path, so no fonts needed
const tiles = (x, y, size) => {
  const t = size * 0.44, g = size * 0.12, sw = size * 0.045, r = size * 0.1
  const cell = (cx, cy, fill) => `<rect x="${cx}" y="${cy}" width="${t}" height="${t}" rx="${r}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/>`
  const ux = x + t * 0.3, uy = y + t * 0.24, uw = t * 0.4, uh = t * 0.5
  return cell(x, y, GREEN) + cell(x + t + g, y, PAPER) + cell(x, y + t + g, PAPER) + cell(x + t + g, y + t + g, RED) +
    `<path d="M${ux} ${uy} v${uh * 0.6} a${uw / 2} ${uw / 2} 0 0 0 ${uw} 0 v-${uh * 0.6}" fill="none" stroke="${PAPER}" stroke-width="${t * 0.13}" stroke-linecap="round"/>`
}
// full-bleed square app icon (iOS rounds the corners itself); `pad` shrinks the mark for Android maskable icons
const appIcon = (pad = 0.17) => {
  const s = 512, box = s * (1 - pad * 2)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
    <rect width="${s}" height="${s}" fill="${GOLD}"/>
    <g transform="translate(${s * 0.02} ${s * 0.02})" opacity=".9">${tiles(s * pad, s * pad, box).replace(/fill="(#[0-9a-f]{6})"/g, `fill="${INK}"`).replace(/<path[^>]*\/>/, '')}</g>
    ${tiles(s * pad, s * pad, box)}
  </svg>`
}
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${BG}"/>
  <rect x="0" y="560" width="1200" height="70" fill="${GOLD}" stroke="${INK}" stroke-width="5"/>
  <text x="60" y="608" font-family="Impact" font-size="34" fill="${INK}" letter-spacing="2">FUMBUA ✦ MAFUMBO ✦ WINDO ✦ PANGUA ✦ VITA LIVE ✦ CHANGAMOTO</text>
  <g transform="translate(90 95) rotate(-6 190 190)">
    <rect x="14" y="14" width="380" height="380" rx="80" fill="${INK}"/>
    <rect x="0" y="0" width="380" height="380" rx="80" fill="${GOLD}" stroke="${INK}" stroke-width="8"/>
    ${tiles(62, 62, 256)}
  </g>
  <text x="560" y="290" font-family="Impact" font-size="168" fill="${INK}">UBONGO</text>
  <text x="564" y="380" font-family="Arial Black" font-size="40" fill="${INK}">Michezo ya maneno</text>
  <text x="564" y="432" font-family="Arial Black" font-size="40" fill="${RED}">ya Kiswahili.</text>
  <text x="564" y="490" font-family="Arial" font-weight="bold" font-size="26" fill="#5c574e">Cheza bure · shindana live na marafiki</text>
</svg>`

const render = (svg, w) => new Resvg(svg, { fitTo: { mode: 'width', value: w }, font: { loadSystemFonts: true } }).render().asPng()
const out = (name, buf) => { fs.writeFileSync(`public/${name}`, buf); console.log(name, buf.length, 'bytes') }
out('apple-touch-icon.png', render(appIcon(), 180))
out('icon-192.png', render(appIcon(), 192))
out('icon-512.png', render(appIcon(), 512))
out('icon-maskable-512.png', render(appIcon(0.24), 512))
out('og.png', render(og, 1200))
