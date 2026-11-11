export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export type Rng = () => number

export function hashStr(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
export const rngFor = (s: string) => mulberry32(hashStr(s))

// Game days follow Tanzania time (EAT, UTC+3, no DST) for everyone — app and server alike.
const EAT = 3 * 3600_000, DAY = 86400_000
const EPOCH = Math.floor(Date.UTC(2026, 0, 1) / DAY)
const eat = (d: Date) => new Date(d.getTime() + EAT)
export function dayKey(d = new Date()) {
  const e = eat(d), p = (n: number) => String(n).padStart(2, '0')
  return `${e.getUTCFullYear()}-${p(e.getUTCMonth() + 1)}-${p(e.getUTCDate())}`
}
export function dayIndex(d = new Date()) {
  return Math.floor((d.getTime() + EAT) / DAY) - EPOCH
}
export function weekKey(d = new Date()) {
  return `W${Math.floor((dayIndex(d) + 3) / 7)}`
}
/** Keys for Monday..Sunday of the current EAT week. */
export function weekDays(d = new Date()) {
  const dow = (eat(d).getUTCDay() + 6) % 7
  return Array.from({ length: 7 }, (_, i) => dayKey(new Date(d.getTime() + (i - dow) * DAY)))
}
export function shuffle<T>(arr: T[], rng: Rng = Math.random): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
export const pick = <T,>(arr: T[], rng: Rng = Math.random) => arr[Math.floor(rng() * arr.length)]
export function weighted(entries: [string, number][], rng: Rng) {
  const total = entries.reduce((s, e) => s + e[1], 0)
  let r = rng() * total
  for (const [k, w] of entries) { r -= w; if (r <= 0) return k }
  return entries[0][0]
}
export function msUntilMidnight() {
  return DAY - ((Date.now() + EAT) % DAY)
}
export function fmtCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60
  return [h, m, x].map(n => String(n).padStart(2, '0')).join(':')
}
