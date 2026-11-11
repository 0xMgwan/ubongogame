// Ubongo's own icon set — thick ink strokes with a flat colour fill, matching the Bongo "paper & ink" look.
// No emoji in the UI chrome.
import type { CSSProperties } from 'react'

type P = { size?: number; className?: string; style?: CSSProperties; fill?: string }
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const paths: Record<string, (f: string) => JSX.Element> = {
  home: f => <><path d="M3.5 11 12 4l8.5 7" {...S} /><path d="M5.5 9.5V20h13V9.5" {...S} fill={f} /><path d="M10 20v-5.5h4V20" {...S} /></>,
  swords: f => <><path d="m4 4 9.5 9.5M20 4l-9.5 9.5" {...S} /><path d="M4 4h3.5L14 10.5 10.5 14 4 7.5Z" {...S} fill={f} /><path d="m6 14 4 4M5 19l2.5-2.5M18 14l-4 4M19 19l-2.5-2.5" {...S} /></>,
  trophy: f => <><path d="M7 4h10v5a5 5 0 0 1-10 0Z" {...S} fill={f} /><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3M8 20h8l-1-3H9Z" {...S} /></>,
  bag: f => <><path d="M5 8h14l-1 12H6Z" {...S} fill={f} /><path d="M9 10V7a3 3 0 0 1 6 0v3" {...S} /></>,
  user: f => <><circle cx="12" cy="8.5" r="4" {...S} fill={f} /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" {...S} /></>,
  coin: () => <><circle cx="12" cy="12" r="9" {...S} fill="#f5b800" /><circle cx="12" cy="12" r="5.6" {...S} strokeWidth={1.6} /><path d="M10 9.5v3.2a2 2 0 0 0 4 0V9.5" {...S} strokeWidth={1.8} /></>,
  gem: () => <><path d="M7 4h10l4 5-9 11L3 9Z" {...S} fill="#7ee8ff" /><path d="M3 9h18M9.5 4 8 9l4 11 4-11-1.5-5" {...S} strokeWidth={1.6} /></>,
  bulb: f => <><path d="M9 17h6v-1.5c0-1.3.6-2.3 1.6-3.3A5.5 5.5 0 1 0 7.4 12.2c1 1 1.6 2 1.6 3.3Z" {...S} fill={f} /><path d="M10 20.5h4M12 7.5v3M10.5 10.5h3" {...S} /></>,
  clock: f => <><circle cx="12" cy="13" r="7.5" {...S} fill={f} /><path d="M12 9.5V13l2.5 1.8M10 3h4M12 3v2.5M18.5 6.5l1.5-1.5" {...S} /></>,
  bomb: f => <><circle cx="10.5" cy="14" r="6.5" {...S} fill={f} /><path d="m15 9.5 2-2M17.5 3.5v1.5M20.5 6.5H19M19.6 4.4l-1 1M8 12a2.5 2.5 0 0 1 2.5-2.5" {...S} /></>,
  shield: f => <><path d="M12 3 5 6v5.5c0 4.3 3 7.7 7 9.5 4-1.8 7-5.2 7-9.5V6Z" {...S} fill={f} /><path d="m9 12 2 2 4-4" {...S} /></>,
  crown: f => <><path d="M4 8l4 4 4-7 4 7 4-4-2 10H6Z" {...S} fill={f} /><path d="M6 21h12" {...S} /></>,
  fire: f => <><path d="M12 21c-4 0-6.5-2.6-6.5-6.3C5.5 10 10 8 9.5 3c3.5 2 7 5.5 7 9.5 0-1.3-.4-2.5-1-3.3 2 1.3 3 3.3 3 5.5 0 3.7-2.5 6.3-6.5 6.3Z" {...S} fill={f} /><path d="M12 21c-1.7 0-3-1.2-3-3 0-2 1.5-2.7 1.8-4.5 1.6 1 3.2 2.6 3.2 4.5 0 1.8-.8 3-2 3Z" {...S} strokeWidth={1.6} /></>,
  chest: f => <><path d="M3.5 10h17v10h-17Z" {...S} fill={f} /><path d="M3.5 10V8a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4v2M3.5 14h17M10.5 12.5h3v3h-3Z" {...S} /></>,
  megaphone: f => <><path d="M3.5 10v4h3l9 5V5l-9 5Z" {...S} fill={f} /><path d="M6.5 14l1.5 5.5h2.5L9.5 14.6M19 9.5a3.5 3.5 0 0 1 0 5" {...S} /></>,
  link: () => <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L11.5 6.8" {...S} /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5" {...S} /></>,
  share: f => <><circle cx="18" cy="5.5" r="2.5" {...S} fill={f} /><circle cx="6" cy="12" r="2.5" {...S} fill={f} /><circle cx="18" cy="18.5" r="2.5" {...S} fill={f} /><path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4" {...S} /></>,
  whatsapp: () => <><path d="M4 20l1.2-4A8.5 8.5 0 1 1 8.4 19Z" {...S} fill="#25d366" /><path d="M9 8.5c0 3.5 2.8 6.5 6.5 6.5l1-1.5-2-1-1 .8a5 5 0 0 1-2.3-2.3l.8-1-1-2Z" {...S} strokeWidth={1.6} fill="#fff" /></>,
  back: () => <path d="M14.5 5 7.5 12l7 7" {...S} strokeWidth={2.6} />,
  next: () => <path d="M9.5 5l7 7-7 7" {...S} strokeWidth={2.6} />,
  close: () => <path d="M6 6l12 12M18 6 6 18" {...S} strokeWidth={2.6} />,
  check: () => <path d="m5 12.5 4.5 4.5L19 7" {...S} strokeWidth={2.8} />,
  play: f => <path d="M7 4.5v15l12-7.5Z" {...S} fill={f} />,
  shuffle: () => <><path d="M3.5 7h3c4 0 6 10 10 10h4M3.5 17h3c1.6 0 2.8-1.6 3.8-3.5M14 10.5c.9-1.9 2-3.5 3.5-3.5h3" {...S} /><path d="m18 4.5 2.5 2.5L18 9.5M18 14.5l2.5 2.5-2.5 2.5" {...S} /></>,
  sound: f => <><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5Z" {...S} fill={f} /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" {...S} /></>,
  phone: f => <><rect x="7" y="2.5" width="10" height="19" rx="2.5" {...S} fill={f} /><path d="M11 18.5h2M3.5 9v6M20.5 9v6" {...S} /></>,
  copy: f => <><rect x="8.5" y="8.5" width="11" height="11" rx="2" {...S} fill={f} /><path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" {...S} /></>,
  refresh: () => <><path d="M19.5 12A7.5 7.5 0 1 1 17 6.4" {...S} /><path d="M19.5 4v4h-4" {...S} /></>,
  lock: f => <><rect x="5" y="10.5" width="14" height="10" rx="2.5" {...S} fill={f} /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14.5v2" {...S} /></>,
  ghost: f => <><path d="M5 20.5V11a7 7 0 0 1 14 0v9.5l-2.3-1.8-2.4 1.8-2.3-1.8-2.3 1.8-2.4-1.8Z" {...S} fill={f} /><circle cx="9.5" cy="11" r="1" fill="currentColor" /><circle cx="14.5" cy="11" r="1" fill="currentColor" /></>,
  users: f => <><circle cx="9" cy="8.5" r="3.5" {...S} fill={f} /><path d="M2.5 19.5a6.5 6.5 0 0 1 13 0M16 5.2a3.5 3.5 0 0 1 0 6.6M18 14a6.5 6.5 0 0 1 3.5 5.5" {...S} /></>,
  eye: f => <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" {...S} fill={f} /><circle cx="12" cy="12" r="3" {...S} /></>,
  tap: f => <><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10l5 1.2a2 2 0 0 1 1.5 2.3L17.5 19a2 2 0 0 1-2 1.6H11a2 2 0 0 1-1.6-.8L6 15.3a1.5 1.5 0 0 1 2.2-2L9 14" {...S} fill={f} /></>,
  pin: f => <><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z" {...S} fill={f} /><circle cx="12" cy="10" r="2.3" {...S} /></>,
  key: f => <><circle cx="8" cy="15" r="4.5" {...S} fill={f} /><path d="m11.2 11.8 8.3-8.3M16.5 6.5l2.5 2.5M14 9l2 2" {...S} /></>,
  ticket: f => <><path d="M3.5 7.5h17v3a2 2 0 0 0 0 3v3h-17v-3a2 2 0 0 0 0-3Z" {...S} fill={f} /><path d="M14.5 7.5v9" {...S} strokeDasharray="1.5 2.2" /></>,
  plus: () => <path d="M12 5v14M5 12h14" {...S} strokeWidth={2.8} />,
  bolt: f => <path d="M13.5 2.5 5 14h6l-1 7.5L19 10h-6Z" {...S} fill={f} />,
  star: f => <path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8Z" {...S} fill={f} />,
  calendar: f => <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" {...S} fill={f} /><path d="M3.5 10h17M8 3v4M16 3v4" {...S} /></>,
  video: f => <><rect x="3" y="6" width="13" height="12" rx="2.5" {...S} fill={f} /><path d="m16 10.5 5-3v9l-5-3" {...S} /></>,
  keyboard: f => <><rect x="2.5" y="6" width="19" height="12" rx="2.5" {...S} fill={f} /><path d="M6 9.5h.01M9.5 9.5h.01M13 9.5h.01M16.5 9.5h.01M6 12.5h.01M9.5 12.5h.01M13 12.5h.01M16.5 12.5h.01M8 15.2h8" {...S} strokeWidth={2.4} /></>,
  sun: f => <><circle cx="12" cy="12" r="4.5" {...S} fill={f} /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" {...S} /></>,
  moon: f => <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" {...S} fill={f} />,
  iosShare: () => <><path d="M12 3v12M8 7l4-4 4 4" {...S} /><path d="M8.5 10.5H6v10h12v-10h-2.5" {...S} /></>,
  dots: () => <><circle cx="12" cy="5" r="1.8" fill="currentColor" /><circle cx="12" cy="12" r="1.8" fill="currentColor" /><circle cx="12" cy="19" r="1.8" fill="currentColor" /></>,
  addHome: f => <><rect x="3.5" y="3.5" width="17" height="17" rx="4" {...S} fill={f} /><path d="M12 8v8M8 12h8" {...S} strokeWidth={2.6} /></>,
  download: f => <><path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5" {...S} /><path d="M4 16.5v3h16v-3" {...S} fill={f} /></>,
  picture: f => <><rect x="3" y="4.5" width="18" height="15" rx="2.5" {...S} fill={f} /><circle cx="9" cy="9.5" r="1.8" {...S} strokeWidth={1.8} /><path d="m3.5 17 5-5 4 4 2.5-2.5L21 19" {...S} /></>,
  file: f => <><path d="M6 2.5h8l4.5 4.5v14.5H6Z" {...S} fill={f} /><path d="M14 2.5V7h4.5M9 12h6M9 15.5h6" {...S} /></>,
  ban: () => <><circle cx="12" cy="12" r="8.5" {...S} /><path d="m6 6 12 12" {...S} /></>,
  search: f => <><circle cx="10.5" cy="10.5" r="6.5" {...S} fill={f} /><path d="m15.5 15.5 5 5" {...S} strokeWidth={2.8} /></>,
  logout: () => <><path d="M14 4.5H6.5v15H14M10 12h10M16.5 8.5 20 12l-3.5 3.5" {...S} /></>,
  // ad-icon set (advertisers pick one)
  duka: f => <><path d="M4 9.5h16L19 20H5Z" {...S} fill={f} /><path d="M3 9.5 5.5 4h13L21 9.5M9 13.5h6" {...S} /></>,
  kahawa: f => <><path d="M4.5 9h12v5.5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5Z" {...S} fill={f} /><path d="M16.5 10.5h1.5a2.5 2.5 0 0 1 0 5h-1.8M8.5 3.5c-.8 1 .8 2 0 3M12.5 3.5c-.8 1 .8 2 0 3" {...S} /></>,
  chakula: f => <><path d="M3 12h18a9 9 0 0 1-18 0Z" {...S} fill={f} /><path d="M7 9.5c1-1.5 3-2.5 5-2.5s4 1 5 2.5M12 4.5V7" {...S} /></>,
  simu: f => <><rect x="7" y="2.5" width="10" height="19" rx="2.5" {...S} fill={f} /><path d="M11 18.5h2" {...S} /></>,
  gari: f => <><path d="M3.5 16v-3.5l2-5h13l2 5V16Z" {...S} fill={f} /><circle cx="7.5" cy="16.5" r="2" {...S} fill="currentColor" /><circle cx="16.5" cy="16.5" r="2" {...S} fill="currentColor" /><path d="M6 12.5h12" {...S} /></>,
  benki: f => <><path d="M3.5 9 12 4l8.5 5Z" {...S} fill={f} /><path d="M6 10.5v7M10 10.5v7M14 10.5v7M18 10.5v7M3.5 20h17" {...S} /></>,
  muziki: f => <><path d="M9 17.5V5.5l10-2v12" {...S} /><circle cx="6.5" cy="17.5" r="2.7" {...S} fill={f} /><circle cx="16.5" cy="15.5" r="2.7" {...S} fill={f} /></>,
  mpira: f => <><circle cx="12" cy="12" r="8.5" {...S} fill={f} /><path d="m12 8 3.3 2.4-1.3 3.9h-4l-1.3-3.9Z" {...S} fill="currentColor" /><path d="M12 8V3.5M15.3 10.4l4-1.3M14 14.3l2.5 3.5M10 14.3l-2.5 3.5M8.7 10.4l-4-1.3" {...S} strokeWidth={1.6} /></>,
}

export type IconName = keyof typeof paths
export function Icon({ name, size = 22, className, style, fill = 'var(--accent)' }: P & { name: IconName | string }) {
  const draw = paths[name] ?? paths.star
  return <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={{ flex: 'none', ...style }} aria-hidden>{draw(fill)}</svg>
}

// ---------------------------------------------------------------- game marks
const INK = 'var(--ink)'
const tile = (x: number, y: number, c: string, ch?: string, s = 18) => (
  <g key={`${x}-${y}`}>
    <rect x={x} y={y} width={s} height={s} rx={4} fill={c} stroke={INK} strokeWidth={2.5} />
    {ch && <text x={x + s / 2} y={y + s * 0.72} textAnchor="middle" fontFamily="Archivo, sans-serif" fontWeight={900} fontSize={s * 0.62} fill="#141414">{ch}</text>}
  </g>
)
export function GameMark({ game, size = 64 }: { game: string; size?: number }) {
  const body: Record<string, JSX.Element> = {
    fumbua: <>
      {tile(4, 8, '#12805c', 'N')}{tile(24, 8, '#f5b800', 'E')}{tile(44, 8, '#d8d2c4', 'N')}
      {tile(14, 30, '#12805c', 'O')}{tile(34, 30, '#12805c', 'A')}
      <path d="M26 52h12v8H26z" fill="#141414" /><circle cx="32" cy="56" r="1.6" fill="#f5b800" />
    </>,
    mafumbo: <>
      {tile(24, 0, '#fffdf8', 'U', 16)}{tile(24, 16, '#f5b800', 'B', 16)}{tile(8, 32, '#fffdf8', 'J', 16)}{tile(24, 32, '#f5b800', 'O', 16)}{tile(40, 32, '#fffdf8', 'T', 16)}{tile(24, 48, '#fffdf8', 'O', 16)}
      <text x={48} y={14} fontFamily="Archivo" fontWeight={900} fontSize={13} fill={INK}>?</text>
    </>,
    windo: <>
      {[0, 1, 2].flatMap(r => [0, 1, 2].map(c => <circle key={`${r}${c}`} cx={12 + c * 20} cy={12 + r * 20} r={6.5} fill="#fffdf8" stroke={INK} strokeWidth={2.5} />))}
      <path d="M12 52 32 32 52 32 52 12" fill="none" stroke="#1f6feb" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" opacity={.9} />
      <path d="M46 14l6-6 1 8" fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {[[12, 52], [32, 32], [52, 32], [52, 12]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={6.5} fill="#1f6feb" stroke={INK} strokeWidth={2.5} />)}
    </>,
    pangua: <>
      <circle cx={32} cy={32} r={27} fill="#ff9fb6" stroke={INK} strokeWidth={2.5} />
      {['K', 'I', 'T', 'A', 'B', 'U'].map((ch, i) => {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2, x = 32 + Math.cos(a) * 18, y = 32 + Math.sin(a) * 18
        return <g key={i}><circle cx={x} cy={y} r={7} fill="#fffdf8" stroke={INK} strokeWidth={2} /><text x={x} y={y + 3.6} textAnchor="middle" fontFamily="Archivo" fontWeight={900} fontSize={10} fill="#141414">{ch}</text></g>
      })}
      <path d="M27 31a5 5 0 0 1 9-2M37 33a5 5 0 0 1-9 2" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
      <path d="M36 26v3h-3M28 38v-3h3" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </>,
  }
  return <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden style={{ flex: 'none', overflow: 'visible' }}>{body[game]}</svg>
}

// ---------------------------------------------------------------- animal avatars (stickers)
const O = { stroke: '#141414', strokeWidth: 2.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
const eyes = (y = 30, dx = 7, cx = 32) => <><circle cx={cx - dx} cy={y} r={2.4} fill="#141414" /><circle cx={cx + dx} cy={y} r={2.4} fill="#141414" /><circle cx={cx - dx + .8} cy={y - .8} r={.8} fill="#fff" /><circle cx={cx + dx + .8} cy={y - .8} r={.8} fill="#fff" /></>
const ANIMALS: Record<string, { bg: string; art: JSX.Element }> = {
  simba: { bg: '#ffd48a', art: <>
    <path d="M32 6l5 5 7-3 2 7 7 1-2 7 6 4-5 5 4 6-6 3 1 7-7-1-3 6-6-4-6 4-3-6-7 1 1-7-6-3 4-6-5-5 6-4-2-7 7-1 2-7 7 3Z" fill="#d9822b" {...O} />
    <circle cx={32} cy={33} r={15} fill="#f5c46a" {...O} />{eyes(30, 6)}
    <ellipse cx={28.5} cy={39} rx={4} ry={3.2} fill="#fff3d6" {...O} strokeWidth={1.8} /><ellipse cx={35.5} cy={39} rx={4} ry={3.2} fill="#fff3d6" {...O} strokeWidth={1.8} />
    <path d="M29 34.5h6l-3 3.2Z" fill="#6b3a1c" {...O} strokeWidth={1.6} />
  </> },
  tembo: { bg: '#cfe3ff', art: <>
    <ellipse cx={13} cy={30} rx={10} ry={13} fill="#9fb2c8" {...O} /><ellipse cx={51} cy={30} rx={10} ry={13} fill="#9fb2c8" {...O} />
    <circle cx={32} cy={28} r={15} fill="#b8c6d6" {...O} />{eyes(26, 6)}
    <path d="M28 34c0 8 1 14 6 18 2 1.5 4 0 3-2-3-4-3-9-3-16" fill="#b8c6d6" {...O} />
    <path d="M23 38l-3 6M41 38l3 6" stroke="#fffdf8" strokeWidth={4} strokeLinecap="round" /><path d="M23 38l-3 6M41 38l3 6" fill="none" {...O} strokeWidth={1.4} />
  </> },
  twiga: { bg: '#fff0b8', art: <>
    <path d="M24 8v8M40 8v8" {...O} /><circle cx={24} cy={7} r={3} fill="#a0612b" {...O} /><circle cx={40} cy={7} r={3} fill="#a0612b" {...O} />
    <ellipse cx={15} cy={21} rx={6} ry={3.5} fill="#f5b800" {...O} transform="rotate(-20 15 21)" /><ellipse cx={49} cy={21} rx={6} ry={3.5} fill="#f5b800" {...O} transform="rotate(20 49 21)" />
    <path d="M20 22c0-6 5-9 12-9s12 3 12 9l-2 18c-1 6-5 10-10 10s-9-4-10-10Z" fill="#f5b800" {...O} />
    <circle cx={25} cy={18} r={2.6} fill="#a0612b" /><circle cx={40} cy={21} r={2} fill="#a0612b" /><circle cx={38} cy={14.5} r={1.6} fill="#a0612b" />
    {eyes(28, 6)}<ellipse cx={32} cy={44} rx={8} ry={6} fill="#ffe08a" {...O} /><circle cx={29} cy={43} r={1.2} fill="#141414" /><circle cx={35} cy={43} r={1.2} fill="#141414" />
  </> },
  punda: { bg: '#d9f2e5', art: <>
    <path d="M22 10l3 9M42 10l-3 9" {...O} /><path d="M20 8l6 4-2 7ZM44 8l-6 4 2 7Z" fill="#fffdf8" {...O} />
    <path d="M21 22c0-6 5-10 11-10s11 4 11 10l-2 16c-1 7-4 12-9 12s-8-5-9-12Z" fill="#fffdf8" {...O} />
    <path d="M25 16l4 4M39 16l-4 4M22 26l6 2M42 26l-6 2M23 33l5 1M41 33l-5 1M32 13v6" stroke="#141414" strokeWidth={3} strokeLinecap="round" />
    {eyes(29, 6)}<ellipse cx={32} cy={44} rx={8} ry={6} fill="#3a3a3a" {...O} /><circle cx={29} cy={43.5} r={1.4} fill="#fffdf8" /><circle cx={35} cy={43.5} r={1.4} fill="#fffdf8" />
  </> },
  chui: { bg: '#ffe0b3', art: <>
    <path d="M14 20l2-9 9 5M50 20l-2-9-9 5" fill="#f2b04a" {...O} />
    <circle cx={32} cy={32} r={19} fill="#f2b04a" {...O} />
    {[[20, 22], [43, 21], [18, 36], [46, 36], [32, 17], [25, 46], [40, 46]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={2.4} fill="none" stroke="#6b3a1c" strokeWidth={1.8} />)}
    {eyes(30, 7)}<ellipse cx={32} cy={40} rx={7} ry={5} fill="#fff3d6" {...O} strokeWidth={1.8} /><path d="M29.5 36.5h5l-2.5 2.6Z" fill="#141414" />
  </> },
  kifaru: { bg: '#e6e1f5', art: <>
    <path d="M16 18l2-7 6 6M48 18l-2-7-6 6" fill="#8d96a3" {...O} />
    <path d="M14 30c0-10 8-16 18-16s18 6 18 16-6 20-18 20-18-10-18-20Z" fill="#a3acb8" {...O} />
    <path d="M30 34l2-14 3 13Z" fill="#fffdf8" {...O} /><path d="M37 33l2-7 2 6Z" fill="#fffdf8" {...O} />
    {eyes(31, 10)}<ellipse cx={32} cy={42} rx={9} ry={5.5} fill="#bfc6cf" {...O} /><circle cx={28} cy={42} r={1.3} fill="#141414" /><circle cx={36} cy={42} r={1.3} fill="#141414" />
  </> },
  kiboko: { bg: '#f5d6e8', art: <>
    <circle cx={18} cy={15} r={4.5} fill="#a58fb5" {...O} /><circle cx={46} cy={15} r={4.5} fill="#a58fb5" {...O} />
    <ellipse cx={32} cy={27} rx={17} ry={14} fill="#a58fb5" {...O} />{eyes(24, 7)}
    <ellipse cx={32} cy={42} rx={20} ry={12} fill="#c4b0d3" {...O} />
    <ellipse cx={25} cy={38} rx={2.4} ry={1.8} fill="#141414" /><ellipse cx={39} cy={38} rx={2.4} ry={1.8} fill="#141414" />
    <path d="M23 48v3M41 48v3" stroke="#fffdf8" strokeWidth={4} strokeLinecap="round" />
  </> },
  kasuku: { bg: '#c9f0d4', art: <>
    <path d="M30 8c-2 3-1 6 2 7M36 7c0 3 0 6-3 8" fill="none" stroke="#e5452b" strokeWidth={4} strokeLinecap="round" />
    <path d="M14 34c0-12 8-20 18-20s18 8 18 20-8 18-18 18-18-6-18-18Z" fill="#12b07a" {...O} />
    <circle cx={24} cy={30} r={6} fill="#fffdf8" {...O} strokeWidth={1.8} /><circle cx={24} cy={30} r={2.8} fill="#141414" />
    <path d="M34 26c8 0 12 5 11 12-1 6-5 9-9 9 2-3 2-6 0-8-3-2-5-3-6-6 0-4 2-7 4-7Z" fill="#f5b800" {...O} />
    <path d="M36 41c3 0 5-2 6-4" fill="none" {...O} strokeWidth={1.8} />
  </> },
  kobe: { bg: '#e2f0c4', art: <>
    <path d="M10 30c0-12 10-20 22-20s22 8 22 20Z" fill="#7a9a3a" {...O} />
    <path d="M24 12l-2 18M40 12l2 18M12 22h40M32 10v20" stroke="#141414" strokeWidth={1.8} />
    <ellipse cx={32} cy={41} rx={14} ry={12} fill="#9ccf6a" {...O} />{eyes(39, 6)}
    <path d="M27 46c3 2.5 7 2.5 10 0" fill="none" {...O} strokeWidth={1.8} /><path d="M8 30h48" {...O} />
  </> },
  tumbili: { bg: '#ffe2cc', art: <>
    <circle cx={12} cy={30} r={7} fill="#8a5a3c" {...O} /><circle cx={52} cy={30} r={7} fill="#8a5a3c" {...O} /><circle cx={12} cy={30} r={3.5} fill="#f2c9a0" />
    <circle cx={52} cy={30} r={3.5} fill="#f2c9a0" />
    <circle cx={32} cy={30} r={19} fill="#8a5a3c" {...O} />
    <path d="M32 22c-3-4-11-4-11 3 0 3 1 5 1 7-1 3-2 5-2 8 0 6 6 9 12 9s12-3 12-9c0-3-1-5-2-8 0-2 1-4 1-7 0-7-8-7-11-3Z" fill="#f2c9a0" {...O} />
    {eyes(30, 5)}<path d="M28 41c2.5 2 5.5 2 8 0" fill="none" {...O} strokeWidth={1.8} /><circle cx={30.5} cy={36} r={.9} fill="#141414" /><circle cx={33.5} cy={36} r={.9} fill="#141414" />
  </> },
}
export const ANIMAL_NAMES: Record<string, string> = { simba: 'Simba', tembo: 'Tembo', twiga: 'Twiga', punda: 'Punda milia', chui: 'Chui', kifaru: 'Kifaru', kiboko: 'Kiboko', kasuku: 'Kasuku', kobe: 'Kobe', tumbili: 'Tumbili' }

export function AnimalArt({ id, size = 48 }: { id: string; size?: number }) {
  const a = ANIMALS[id] ?? ANIMALS.simba
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden style={{ flex: 'none', display: 'block' }}>
      <circle cx={32} cy={32} r={31} fill={a.bg} />
      <g transform="translate(0 2)">{a.art}</g>
    </svg>
  )
}

/** The daladala that drives along route bars. */
export function Daladala({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 52 32" aria-hidden style={{ display: 'block' }}>
      <path d="M3 6h38c4 0 7 3 8 7l1 9v4H3Z" fill="#f5b800" stroke="#141414" strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M3 17h47" stroke="#12805c" strokeWidth={3.5} />
      {[7, 15, 23, 31].map(x => <rect key={x} x={x} y={9} width={6} height={5} rx={1} fill="#cfe3ff" stroke="#141414" strokeWidth={1.6} />)}
      <path d="M39 9h4l3 5h-7Z" fill="#cfe3ff" stroke="#141414" strokeWidth={1.6} strokeLinejoin="round" />
      <circle cx={12} cy={26} r={4} fill="#141414" /><circle cx={40} cy={26} r={4} fill="#141414" /><circle cx={12} cy={26} r={1.5} fill="#ddd" /><circle cx={40} cy={26} r={1.5} fill="#ddd" />
    </svg>
  )
}
