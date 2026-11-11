import { AnimatePresence, motion, useSpring, useTransform } from 'framer-motion'
import { ReactNode, useEffect, useRef, useState } from 'react'
import { GAMES, GameId, Me, Sponsor, THEMES, levelFromXp, useStore } from '../lib/store'
import { HOUSE, Tab, useNav } from '../lib/nav'
import { api } from '../lib/api'
import { sfx } from '../lib/sound'
import { METHALI } from '../data/words'
import { AnimalArt, GameMark, Icon, IconName } from './icons'
import type { ServerResult } from '../lib/runs'

export const spring = { type: 'spring', stiffness: 420, damping: 32 } as const

export function Avatar({ size = 44, avatar, frame }: { size?: number; avatar?: string; frame?: string }) {
  const s = useStore()
  const f = frame ?? s.frame
  return (
    <div className={`ava f-${f}`} style={{ width: size, height: size }}>
      <AnimalArt id={avatar ?? s.avatar} size={size - 5} />
      {f === 'kifalme' && <span className="crown"><Icon name="crown" size={Math.max(16, size * 0.42)} fill="var(--gold)" /></span>}
    </div>
  )
}

function Rolling({ value }: { value: number }) {
  const sp = useSpring(value, { stiffness: 120, damping: 20 })
  const txt = useTransform(sp, v => Math.round(v).toLocaleString())
  useEffect(() => { sp.set(value) }, [value])
  return <motion.span>{txt}</motion.span>
}

export function Wallet() {
  const { coins, gems } = useStore()
  const go = useNav(n => n.go)
  return (
    <div className="row" style={{ gap: 8 }}>
      <button className="pill" onClick={() => go('duka', 'coins')}><Icon name="coin" size={24} /><Rolling value={coins} /><span className="plus"><Icon name="plus" size={12} /></span></button>
      <button className="pill" onClick={() => go('duka', 'gems')}><Icon name="gem" size={24} /><Rolling value={gems} /><span className="plus"><Icon name="plus" size={12} /></span></button>
    </div>
  )
}

export function TopBar() {
  const s = useStore()
  const go = useNav(n => n.go)
  return (
    <div className="topbar">
      <button style={{ position: 'relative' }} onClick={() => go('mimi')} aria-label="Wasifu">
        <Avatar size={44} />
        <span className="lvl">{levelFromXp(s.xp)}</span>
      </button>
      <div className="grow" />
      <ThemeToggle />
      <Wallet />
    </div>
  )
}

const DARK = new Set(['usiku', 'dhahabu'])
export const isDarkTheme = (t: string) => DARK.has(t)
/** Sun/moon switch in the top bar: flips between the light and dark paper themes. */
export function ThemeToggle() {
  const { theme, updateMe } = useStore()
  const dark = isDarkTheme(theme)
  return (
    <motion.button whileTap={{ scale: .85, rotate: 20 }} className="pill" style={{ width: 36, padding: 0, justifyContent: 'center' }}
      aria-label={dark ? 'Mandhari ya mchana' : 'Mandhari ya usiku'} title={dark ? 'Mchana' : 'Usiku'}
      onClick={() => { sfx.tap(); updateMe({ theme: dark ? 'karatasi' : 'usiku' }) }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={dark ? 'm' : 's'} initial={{ rotate: -90, scale: 0 }} animate={{ rotate: 0, scale: 1 }} exit={{ rotate: 90, scale: 0 }} transition={{ duration: .2 }} style={{ display: 'inline-flex' }}>
          <Icon name={dark ? 'moon' : 'sun'} size={20} fill={dark ? THEMES.usiku.accent : '#f5b800'} />
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}

/** Password input with show/hide. */
export function PasswordField({ value, onChange, placeholder = 'Nenosiri', autoComplete = 'current-password', onEnter }: { value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string; onEnter?: () => void }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input className="field" type={show ? 'text' : 'password'} placeholder={placeholder} value={value} autoComplete={autoComplete} maxLength={128}
        onChange={e => onChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && onEnter?.()} style={{ paddingRight: 52 }} />
      <button type="button" onClick={() => setShow(v => !v)} aria-label={show ? 'Ficha nenosiri' : 'Onyesha nenosiri'}
        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 38, height: 38, display: 'grid', placeItems: 'center', opacity: show ? 1 : .6 }}>
        <Icon name={show ? 'eye' : 'lock'} size={20} />
      </button>
    </div>
  )
}

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Nyumbani', icon: 'home' },
  { id: 'vita', label: 'Vita', icon: 'swords' },
  { id: 'ligi', label: 'Ligi', icon: 'trophy' },
  { id: 'duka', label: 'Duka', icon: 'bag' },
  { id: 'mimi', label: 'Mimi', icon: 'user' },
]
export function BottomNav() {
  const { tab, go } = useNav()
  return (
    <nav className="nav">
      {TABS.map(t => (
        <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => { sfx.tap(); go(t.id) }}>
          {tab === t.id && <motion.div layoutId="navblob" className="blob" transition={spring} />}
          <motion.span animate={{ y: tab === t.id ? -1 : 0, rotate: tab === t.id ? [0, -8, 6, 0] : 0 }} transition={{ duration: .35 }}>
            <Icon name={t.icon} size={24} fill={tab === t.id ? '#fffdf8' : 'none'} />
          </motion.span>
          {t.label}
        </button>
      ))}
    </nav>
  )
}

/** Live-stats ticker, like the landing page's marquee. */
export function Marquee({ items }: { items: ReactNode[] }) {
  const list = [...items, ...items]
  return <div className="marquee" aria-hidden><div className="track">{list.map((x, i) => <span key={i}>{x}</span>)}</div></div>
}

/** Split-flap countdown (departure-board style). */
export function Flap({ text }: { text: string }) {
  return <span className="flap">{[...text].map((c, i) => (c === ':' ? <b key={i}>:</b> : <motion.i key={i + c} initial={{ scaleY: .1 }} animate={{ scaleY: 1 }} transition={{ duration: .12 }}>{c}</motion.i>))}</span>
}

// ---------- Ads (live campaigns from the server, house ad as fallback) ----------
export function useSponsor(slot: string, seed = 0): Sponsor {
  const all = useStore(s => s.sponsors)
  const live = all.filter(x => x.slot === slot)
  if (!live.length) return HOUSE
  return live[(seed + new Date().getHours()) % live.length]
}
const seen = new Set<string>()
function trackImpression(sp: Sponsor, key: string) {
  if (!sp.id || seen.has(key)) return
  seen.add(key)
  api(`/sponsors/${sp.id}/event`, { body: { type: 'impression' } }).catch(() => {})
}
function useSponsorClick(sp: Sponsor) {
  const open = useNav(n => n.openAdvertise)
  return () => {
    if (sp.house || !sp.id) return open(true)
    api(`/sponsors/${sp.id}/event`, { body: { type: 'click' } }).catch(() => {})
    const target = sp.link || sp.pdf // a website first, otherwise the advertiser's PDF flyer
    if (target) window.open(target, '_blank', 'noopener,noreferrer')
  }
}
export function AdIcon({ sp, size = 46 }: { sp: Pick<Sponsor, 'icon' | 'color'>; size?: number }) {
  return <div className="ad-ic" style={{ background: sp.color, width: size, height: size, color: sp.color === '#141414' ? '#fffdf8' : '#141414' }}><Icon name={sp.icon} size={size * 0.56} fill="#fffdf8" /></div>
}
export function AdBanner({ slot, seed = 0 }: { slot: string; seed?: number }) {
  const pro = useStore(s => s.pro)
  const sp = useSponsor(slot, seed)
  const click = useSponsorClick(sp)
  useEffect(() => { if (!pro) trackImpression(sp, `${slot}:${sp.id}:${seed}`) }, [sp.id, pro])
  if (pro && !sp.house) return null
  if (sp.image) return <AdPicture sp={sp} onClick={click} />
  return (
    <motion.button whileTap={{ scale: .98 }} onClick={click} className={`ad ${sp.house ? 'house' : ''}`}>
      <span className="ad-tag">{sp.house ? 'Nafasi wazi' : 'Tangazo'}</span>
      <AdIcon sp={sp} />
      <div className="grow">
        <div style={{ fontWeight: 900 }}>{sp.brand}</div>
        <div className="mute" style={{ fontSize: 12.5, lineHeight: 1.3, fontWeight: 600 }}>{sp.line}</div>
      </div>
      <span className="chip ink">{sp.cta}</span>
    </motion.button>
  )
}
/** A picture ad: the advertiser's image with a brand strip underneath. */
export function AdPicture({ sp, onClick }: { sp: Sponsor; onClick?: () => void }) {
  return (
    <motion.button whileTap={{ scale: .98 }} onClick={onClick} className="ad ad-pic" style={{ background: sp.color }}>
      <span className="ad-tag">Tangazo</span>
      <img src={sp.image!} alt={sp.brand} loading="lazy" />
      <div className="row" style={{ padding: '10px 12px', gap: 10 }}>
        <div className="grow" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900 }}>{sp.brand}</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.line}</div>
        </div>
        <span className="chip ink">{sp.pdf && !sp.link ? <><Icon name="file" size={12} fill="var(--gold)" /> PDF</> : sp.cta}</span>
      </div>
    </motion.button>
  )
}

export function SponsorStrip({ slot, label = 'Imeletwa kwako na' }: { slot: string; label?: string }) {
  const pro = useStore(s => s.pro)
  const sp = useSponsor(slot, 1)
  const click = useSponsorClick(sp)
  useEffect(() => { if (!pro) trackImpression(sp, `${slot}:${sp.id}`) }, [sp.id, pro])
  if (pro) return null
  return (
    <button onClick={click} className="row" style={{ justifyContent: 'center', gap: 6, fontSize: 11.5, color: 'var(--mute)', fontWeight: 700, width: '100%', padding: '6px 0' }}>
      {label} <b style={{ color: 'var(--ink)' }}>{sp.house ? 'wewe? Tangaza hapa →' : sp.brand}</b>
    </button>
  )
}

// ---------- Sheet & dialog ----------
export function Sheet({ open, onClose, children }: { open: boolean; onClose?: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={spring} onClick={e => e.stopPropagation()}>
            <div className="grab" />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
export function Dialog({ open, onClose, children }: { open: boolean; onClose?: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="scrim center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="dialog" initial={{ scale: .85, rotate: -2, opacity: 0, y: 20 }} animate={{ scale: 1, rotate: 0, opacity: 1, y: 0 }} exit={{ scale: .9, opacity: 0 }} transition={spring} onClick={e => e.stopPropagation()}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Toast() {
  const toast = useStore(s => s.toast)
  const set = useStore(s => s.set)
  useEffect(() => { if (toast) { const t = setTimeout(() => set({ toast: null }), 2200); return () => clearTimeout(t) } }, [toast?.id])
  return (
    <AnimatePresence>
      {toast && (
        <motion.div key={toast.id} className="toast" initial={{ y: -40, x: '-50%', opacity: 0, rotate: -3 }} animate={{ y: 0, x: '-50%', opacity: 1, rotate: 0 }} exit={{ y: -30, x: '-50%', opacity: 0 }} transition={spring}>
          {toast.icon && <Icon name={toast.icon} size={18} fill="var(--gold)" />}<span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{toast.text}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------- Confetti (paper scraps in the brand colours) ----------
export function Confetti({ fire }: { fire: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!fire || !ref.current) return
    const cv = ref.current, ctx = cv.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    cv.width = cv.offsetWidth * dpr; cv.height = cv.offsetHeight * dpr
    const colors = ['#f5b800', '#e5452b', '#12805c', '#1f6feb', '#ff9fb6', '#fffdf8']
    const P = Array.from({ length: 140 }, () => ({
      x: cv.width / 2 + (Math.random() - .5) * 60 * dpr, y: cv.height * .45,
      vx: (Math.random() - .5) * 18 * dpr, vy: (-Math.random() * 16 - 6) * dpr,
      w: (Math.random() * 6 + 6) * dpr, h: (Math.random() * 4 + 4) * dpr, rot: Math.random() * 6, vr: (Math.random() - .5) * .4,
      c: colors[Math.floor(Math.random() * colors.length)],
    }))
    let raf = 0, t = 0
    const loop = () => {
      t++; ctx.clearRect(0, 0, cv.width, cv.height)
      for (const p of P) {
        p.vy += .45 * dpr; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.rot += p.vr
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.max(0, 1 - t / 160)
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.lineWidth = 1.5 * dpr; ctx.strokeStyle = '#141414'; ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }
      if (t < 170) raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [fire])
  return <canvas ref={ref} className="confetti" style={{ width: '100%', height: '100%' }} />
}

// ---------- Rewarded ad (server issues the view; reward claimable only after it's been watched) ----------
export function RewardedAd({ open, onDone, onClose, reward }: { open: boolean; onDone: (adViewId: string) => void; onClose: () => void; reward: string }) {
  const [t, setT] = useState(5)
  const [view, setView] = useState<{ adViewId: string; sponsor: Sponsor | null } | null>(null)
  const fail = useStore(s => s.fail)
  useEffect(() => {
    if (!open) return
    setT(5); setView(null)
    api<{ adViewId: string; sponsor: Sponsor | null }>('/ads/view', { body: {} }).then(setView).catch(e => { fail(e); onClose() })
    const iv = setInterval(() => setT(x => (x <= 1 ? (clearInterval(iv), 0) : x - 1)), 1000)
    return () => clearInterval(iv)
  }, [open])
  const sp = view?.sponsor ?? HOUSE
  return (
    <Dialog open={open}>
      <div className="kicker"><Icon name="video" size={14} /> Tangazo · {reward}</div>
      <div style={{ margin: '14px 0', height: 210, borderRadius: 18, background: sp.color, border: 'var(--line)', display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden', color: '#141414' }}>
        {sp.image
          ? <motion.img src={sp.image} alt={sp.brand} initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 5 }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          : <motion.div animate={{ scale: [1, 1.12, 1], rotate: [0, 6, -6, 0] }} transition={{ repeat: Infinity, duration: 2.4 }}><AdIcon sp={{ ...sp, color: '#fffdf8' }} size={92} /></motion.div>}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 14px', background: sp.image ? '#fffdf8' : undefined, borderTop: sp.image ? '2.5px solid #141414' : undefined }}>
          <div className="display" style={{ fontSize: 26 }}>{sp.brand}</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{sp.line}</div>
        </div>
        <motion.div style={{ position: 'absolute', top: 0, left: 0, height: 6, background: '#141414' }} initial={{ width: '0%' }} animate={{ width: open ? '100%' : '0%' }} transition={{ duration: 5, ease: 'linear' }} />
      </div>
      {t > 0 || !view
        ? <button className="btn block" onClick={onClose}>Funga ({t})</button>
        : <button className="btn gold block" onClick={() => { sfx.coin(); onDone(view.adViewId) }}><Icon name="chest" size={20} fill="#fffdf8" /> Pokea {reward}</button>}
    </Dialog>
  )
}

// ---------- share a run as a challenge link ----------
export async function shareChallenge(runId: string, game: GameId, score: number) {
  const s = useStore.getState()
  try {
    const { code } = await api<{ code: string }>('/challenges', { body: { runId } })
    const url = `${location.origin}/c/${code}`
    const text = `Nimepata alama ${score.toLocaleString()} kwenye ${GAMES[game].name} — unaweza kunishinda? 🧠\n${url}`
    if (navigator.share) await navigator.share({ text }).catch(() => {})
    else { window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener'); navigator.clipboard?.writeText(url) }
    s.notify('Changamoto iko tayari!', 'ticket')
  } catch (e) { s.fail(e) }
}

// ---------- Result sheet (numbers come from the server) ----------
export type Result = {
  runId: string; won: boolean; score: number; title: string; sub: string; coins: number; xp: number; doubled?: boolean
  share?: string; stats?: [string, string][]; stamp?: string; challenge?: ServerResult['challenge']; challengeCode?: string | null; mode?: string
}
/** Common Result fields straight from a server result + the run it belongs to. */
export const baseResult = (r: ServerResult, run: { mode: string; challenge: string | null }) =>
  ({ runId: r.runId, won: r.won, score: r.score, coins: r.coins, xp: r.xp, doubled: r.doubled, challenge: r.challenge, challengeCode: run.challenge, mode: run.mode })

export function ResultSheet({ game, result, open, onAgain, onExit, onClose }: { game: GameId; result: Result | null; open?: boolean; onAgain?: () => void; onExit: () => void; onClose?: () => void }) {
  const s = useStore()
  const [boom, setBoom] = useState(0)
  const [ad, setAd] = useState(false)
  const [doubled, setDoubled] = useState(false)
  const celebrated = useRef<string | null>(null)
  const openChallenge = useNav(n => n.openChallenge)
  useEffect(() => {
    if (!result || celebrated.current === result.runId) return
    celebrated.current = result.runId
    setDoubled(!!result.doubled)
    if (result.won) setTimeout(() => { setBoom(b => b + 1); sfx.win() }, 300)
  }, [result])
  const share = () => {
    const txt = result?.share ?? `Ubongo · ${GAMES[game].name}: alama ${result?.score}`
    if (navigator.share) navigator.share({ text: txt }).catch(() => {})
    else { navigator.clipboard?.writeText(txt); s.notify('Imenakiliwa! Bandika WhatsApp', 'copy') }
  }
  const double = async (adViewId: string) => {
    setAd(false)
    try {
      const r = await api<{ bonus: number; me: Me }>(`/runs/${result!.runId}/double`, { body: { adViewId } })
      s.applyMe(r.me); setDoubled(true); s.notify(`+${r.bonus} sarafu za ziada!`, 'coin')
    } catch (e) { s.fail(e) }
  }
  const ch = result?.challenge
  return (
    <>
      <Sheet open={(open ?? true) && !!result} onClose={onClose}>
        {result && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block', margin: '4px 0 10px' }}>
              <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: -4 }} transition={{ ...spring, delay: .05 }}
                style={{ display: 'inline-block', background: GAMES[game].color, border: 'var(--line)', borderRadius: 22, padding: 10, boxShadow: 'var(--shadow)' }}>
                <GameMark game={game} size={74} />
              </motion.div>
              <motion.span className={`stamp ${result.won ? 'green' : ''}`} style={{ position: 'absolute', right: -70, top: 18, fontSize: 18 }}
                initial={{ scale: 2.6, opacity: 0, rotate: -10 }} animate={{ scale: 1, opacity: 1, rotate: -10 }} transition={{ delay: .45, type: 'spring', stiffness: 500, damping: 18 }}>
                {result.stamp ?? (result.won ? 'Umeweza!' : 'Pole!')}
              </motion.span>
            </div>
            <h2 className="display" style={{ fontSize: 40 }}>{result.title}</h2>
            <p className="mute" style={{ margin: '6px 0 14px', fontWeight: 700 }}>{result.sub}</p>

            <div className="row" style={{ justifyContent: 'center', gap: 8, marginBottom: 14 }}>
              {[
                ['ALAMA', result.score.toLocaleString(), 'var(--ink)'],
                [`SARAFU${s.pro || doubled ? ' ×2' : ''}`, `+${(result.coins * (doubled ? 2 : 1)).toLocaleString()}`, 'var(--gold)'],
                ['XP', `+${result.xp}`, 'var(--blue)'],
              ].map(([k, v, c]) => (
                <div key={k} className="card" style={{ flex: 1, padding: '10px 8px', boxShadow: '3px 3px 0 var(--ink)' }}>
                  <div className="mute" style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.08em' }}>{k}</div>
                  <div className="display" style={{ fontSize: 32, color: c, textShadow: c === 'var(--ink)' ? undefined : '2px 2px 0 var(--ink)' }}>{v}</div>
                </div>
              ))}
            </div>

            {ch && (
              <button className="card" onClick={() => { if (result.challengeCode) { onExit(); openChallenge(result.challengeCode) } }}
                style={{ width: '100%', marginBottom: 12, background: ch.beat ? 'var(--green)' : 'var(--paper)', color: ch.beat ? '#fff' : 'var(--ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Icon name={ch.beat ? 'trophy' : 'ticket'} size={30} fill={ch.beat ? 'var(--gold)' : 'var(--accent)'} />
                <div className="grow">
                  <div style={{ fontWeight: 900 }}>{ch.beat ? `Umemshinda! +${ch.bonus} sarafu` : `Ulihitaji ${(ch.creatorScore - result.score + 1).toLocaleString()} zaidi`}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, opacity: .85 }}>Nafasi #{ch.rank} kati ya {ch.plays} kwenye changamoto hii</div>
                </div>
              </button>
            )}
            {result.stats && (
              <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
                {result.stats.map(([k, v]) => <span key={k} className="chip">{k}: <b>{v}</b></span>)}
              </div>
            )}
            {!doubled && result.coins > 0 && (
              <button className="btn gold block nudge" style={{ marginBottom: 10 }} onClick={() => setAd(true)}><Icon name="video" size={20} fill="#fffdf8" /> Tazama tangazo · sarafu ×2</button>
            )}
            {result.mode !== 'duel' && (
              <button className="btn green block" style={{ marginBottom: 10 }} onClick={() => shareChallenge(result.runId, game, result.score)}>
                <Icon name="whatsapp" size={22} /> Mpe rafiki changamoto
              </button>
            )}
            <div className="row" style={{ gap: 10 }}>
              <button className="btn" style={{ flex: 1 }} onClick={share}><Icon name="share" size={18} /> Shiriki</button>
              {onAgain ? <button className="btn ink" style={{ flex: 1.4 }} onClick={onAgain}>Cheza tena <Icon name="next" size={18} /></button>
                : <button className="btn ink" style={{ flex: 1.4 }} onClick={onExit}>Endelea</button>}
            </div>
            {onAgain && <button className="mute" style={{ marginTop: 12, fontWeight: 800, fontSize: 14 }} onClick={onExit}>Rudi nyumbani</button>}
            <div className="spacer" />
            <AdBanner slot="result" seed={result.score} />
            <p className="mute" style={{ fontSize: 12.5, fontStyle: 'italic', marginTop: 14, fontWeight: 600 }}>“{METHALI[result.score % METHALI.length]}”</p>
          </div>
        )}
      </Sheet>
      <RewardedAd open={ad} reward={`+${result?.coins ?? 0} sarafu`} onClose={() => setAd(false)} onDone={double} />
      <Confetti fire={boom} />
    </>
  )
}

// ---------- Game header ----------
export function GameHead({ game, right, sub, onBack }: { game: GameId; right?: ReactNode; sub?: ReactNode; onBack?: () => void }) {
  const play = useNav(n => n.play)
  return (
    <div className="g-head">
      <button className="icon-btn" aria-label="Rudi" onClick={() => { sfx.tap(); onBack ? onBack() : play(null) }}><Icon name="back" size={22} /></button>
      <div style={{ background: GAMES[game].color, border: 'var(--line)', borderRadius: 12, padding: 3, transform: 'rotate(-4deg)' }}><GameMark game={game} size={32} /></div>
      <div className="grow">
        <div className="g-title">{GAMES[game].name}</div>
        <div className="mute" style={{ fontSize: 12, fontWeight: 800 }}>{sub ?? GAMES[game].tag}</div>
      </div>
      {right}
    </div>
  )
}

export function PowerBtn({ icon, count, onClick, label }: { icon: IconName; count?: number; onClick: () => void; label?: string }) {
  return (
    <motion.button whileTap={{ scale: .9, rotate: -6 }} className="icon-btn" onClick={onClick} title={label} aria-label={label}>
      <Icon name={icon} size={24} />
      {count !== undefined && <span className="count" style={{ background: count > 0 ? 'var(--red)' : 'var(--ink)' }}>{count > 0 ? count : '+'}</span>}
    </motion.button>
  )
}

/** Full-screen state while a run is being fetched, or when it couldn't be. */
export function GameLoading({ error, retry }: { error?: string | null; retry: () => void }) {
  return (
    <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}>
      {error ? (
        <div>
          <Icon name="ban" size={56} />
          <p style={{ fontWeight: 800 }}>{error}</p>
          <button className="btn small gold" onClick={retry}><Icon name="refresh" size={16} /> Jaribu tena</button>
        </div>
      ) : (
        <div className="row" style={{ gap: 8 }}>
          {[0, 1, 2, 3].map(i => (
            <motion.div key={i} animate={{ y: [0, -14, 0], rotate: [0, -8, 0] }} transition={{ repeat: Infinity, duration: .8, delay: i * .1 }}
              style={{ width: 34, height: 34, borderRadius: 8, border: 'var(--line)', background: ['var(--green)', 'var(--gold)', 'var(--blue)', 'var(--red)'][i], boxShadow: '2px 2px 0 var(--ink)' }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- Mobile-money checkout (nTZS / demo) ----------
type Pay = { id: string; status: string; amount: number; instructions?: string | null; livemode?: boolean; provider?: string }
export function Checkout({ open, title, amount, product, campaignId, onClose, onPaid }: {
  open: boolean; title: string; amount: number; product: string; campaignId?: number; onClose: () => void; onPaid?: () => void
}) {
  const s = useStore()
  const [phone, setPhone] = useState(() => { try { return localStorage.getItem('ubongo-phone') || '' } catch { return '' } })
  const [pay, setPay] = useState<Pay | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setPay(null); setBusy(false) } }, [open])
  useEffect(() => {
    if (!pay || pay.status !== 'pending') return
    let stop = false
    const started = Date.now()
    const tick = async () => {
      if (stop) return
      try {
        const r = await api<{ payment: Pay; me: Me }>(`/payments/${pay.id}`)
        if (stop) return
        if (r.payment.status === 'paid') { s.applyMe(r.me); sfx.win(); setPay(p => p && { ...p, status: 'paid' }); onPaid?.(); return }
        if (r.payment.status === 'failed') { setPay(p => p && { ...p, status: 'failed' }); return }
      } catch { /* keep polling */ }
      if (Date.now() - started < 4 * 60_000) setTimeout(tick, 2500)
      else setPay(p => p && { ...p, status: 'timeout' })
    }
    const t = setTimeout(tick, 2500)
    return () => { stop = true; clearTimeout(t) }
  }, [pay?.id, pay?.status])

  const start = async () => {
    setBusy(true)
    try {
      try { localStorage.setItem('ubongo-phone', phone) } catch { /* ignore */ }
      const r = await api<{ payment: Pay }>('/payments', { body: { product, phone, campaignId } })
      setPay(r.payment)
    } catch (e) { s.fail(e) } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onClose={() => (!pay || pay.status !== 'pending') && onClose()}>
      <div className="kicker"><Icon name="phone" size={14} /> Malipo kwa simu</div>
      <h2 className="display" style={{ fontSize: 30, margin: '10px 0 2px' }}>{title}</h2>
      <div className="display" style={{ fontSize: 46, color: 'var(--gold)', textShadow: '3px 3px 0 var(--ink)' }}>TSh {amount.toLocaleString()}</div>
      {!s.payments.enabled ? (
        <p style={{ fontWeight: 700 }}>Malipo hayajawashwa bado. Jaribu tena baadaye.</p>
      ) : !pay ? (
        <>
          <p className="mute" style={{ fontSize: 13, fontWeight: 700, margin: '12px 0 8px' }}>M-Pesa · Mixx by Yas · Airtel Money · HaloPesa — utapokea ombi la PIN kwenye simu yako.</p>
          <input className="field" inputMode="tel" placeholder="0712 345 678" value={phone} onChange={e => setPhone(e.target.value)} style={{ fontSize: 20, height: 56, letterSpacing: '.04em' }} />
          <button className="btn block gold" style={{ marginTop: 12 }} disabled={busy || phone.replace(/\D/g, '').length < 9} onClick={start}>{busy ? 'Inatuma…' : 'Lipa sasa'}</button>
        </>
      ) : pay.status === 'pending' ? (
        <div style={{ textAlign: 'center', padding: '16px 0 4px' }}>
          <motion.div animate={{ rotate: [0, -12, 12, -12, 0] }} transition={{ repeat: Infinity, duration: 1.2 }} style={{ display: 'inline-block' }}><Icon name="phone" size={56} /></motion.div>
          <p style={{ fontWeight: 900, marginBottom: 4 }}>Angalia simu yako</p>
          <p className="mute" style={{ fontSize: 13, marginTop: 0, fontWeight: 600 }}>{pay.instructions || 'Weka PIN kuthibitisha malipo.'}</p>
        </div>
      ) : pay.status === 'paid' ? (
        <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
          <span className="stamp green">Imelipwa</span>
          <p style={{ fontWeight: 900 }}>Malipo yamepokelewa!</p>
          <button className="btn block ink" onClick={onClose}>Sawa</button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
          <span className="stamp">{pay.status === 'timeout' ? 'Subiri' : 'Imeshindikana'}</span>
          <p style={{ fontWeight: 900 }}>{pay.status === 'timeout' ? 'Bado hatujapokea uthibitisho' : 'Malipo hayakufanikiwa'}</p>
          <p className="mute" style={{ fontSize: 13, fontWeight: 600 }}>{pay.status === 'timeout' ? 'Ukilipa, yataingia yenyewe ndani ya dakika chache.' : 'Hakuna pesa iliyokatwa. Jaribu tena.'}</p>
          <button className="btn block" onClick={() => setPay(null)}>Jaribu tena</button>
        </div>
      )}
      {s.payments.provider === 'demo' && <p className="mute" style={{ fontSize: 11.5, textAlign: 'center', marginTop: 12, fontWeight: 700 }}>Hali ya majaribio — hakuna pesa halisi itakayokatwa.</p>}
    </Dialog>
  )
}
