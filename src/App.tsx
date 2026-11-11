import { AnimatePresence, motion } from 'framer-motion'
import { CSSProperties, useEffect, useState } from 'react'
import { AVATARS, Me, REGIONS, THEMES, ThemeId, useStore } from './lib/store'
import { useNav } from './lib/nav'
import { api } from './lib/api'
import { sfx } from './lib/sound'
import { BottomNav, Toast, spring } from './components/ui'
import { ANIMAL_NAMES, AnimalArt, GameMark, Icon } from './components/icons'
import Home from './screens/Home'
import Vita from './screens/Vita'
import Leaderboard from './screens/Leaderboard'
import Shop from './screens/Shop'
import Profile from './screens/Profile'
import Advertise from './screens/Advertise'
import Challenge from './screens/Challenge'
import Fumbua from './games/Fumbua'
import Mafumbo from './games/Mafumbo'
import Windo from './games/Windo'
import Pangua from './games/Pangua'

const GAME_VIEWS = { fumbua: Fumbua, mafumbo: Mafumbo, windo: Windo, pangua: Pangua }
const TABS = { home: Home, vita: Vita, ligi: Leaderboard, duka: Shop, mimi: Profile }

function themeVars(id: ThemeId): CSSProperties {
  const t = THEMES[id] ?? THEMES.karatasi
  return { ['--bg' as any]: t.bg, ['--paper' as any]: t.paper, ['--ink' as any]: t.ink, ['--soft' as any]: t.soft, ['--accent' as any]: t.accent }
}

export default function App() {
  const theme = useStore(s => s.theme)
  const status = useStore(s => s.status)
  const boot = useStore(s => s.boot)
  const { tab, game, run, advertise, challenge, openChallenge, play } = useNav()
  const [minSplash, setMinSplash] = useState(true)
  useEffect(() => {
    boot()
    const m = location.pathname.match(/^\/c\/([a-z0-9]{4,12})$/i)
    if (m) openChallenge(m[1].toLowerCase())
    const t = setTimeout(() => setMinSplash(false), 1500)
    return () => clearTimeout(t)
  }, [])
  // refresh wallet + sponsors when the player comes back to the app
  useEffect(() => {
    const h = () => { if (document.visibilityState === 'visible' && useStore.getState().status === 'ready') boot() }
    document.addEventListener('visibilitychange', h); return () => document.removeEventListener('visibilitychange', h)
  }, [])
  useEffect(() => { document.querySelector('meta[name=theme-color]')?.setAttribute('content', THEMES[theme]?.bg ?? '#f6f1e6') }, [theme])

  const splash = minSplash || status === 'boot'
  const ready = status === 'ready'
  const Game = game ? GAME_VIEWS[game] : null
  const Tab = TABS[tab] ?? Home

  return (
    <div className="stage">
      <div className="app" style={themeVars(theme)}>
        <AnimatePresence>
          {splash ? <Splash key="splash" /> : status === 'offline' ? <Offline key="off" /> : !ready ? <Onboard key="onb" invited={!!challenge} /> : Game ? (
            <motion.div key={'g-' + game + (run?.id ?? '')} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', zIndex: 10, background: 'var(--bg)' }}
              initial={{ opacity: 0, scale: .96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .97 }} transition={spring}>
              <Game run={run} onLeave={() => play(null)} />
            </motion.div>
          ) : (
            <motion.div key={'t-' + tab} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}
              initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: .2 }}>
              <Tab />
            </motion.div>
          )}
        </AnimatePresence>
        {!splash && ready && !game && <BottomNav />}
        <AnimatePresence>{advertise && <Advertise key="adv" />}</AnimatePresence>
        <AnimatePresence>{!splash && ready && challenge && <Challenge key={'ch' + challenge} code={challenge} />}</AnimatePresence>
        <Toast />
      </div>
    </div>
  )
}

function Splash() {
  const tiles = [['U', '#12805c'], ['B', '#f5b800'], ['O', '#fffdf8'], ['N', '#e5452b'], ['G', '#8ec1ff'], ['O', '#ff9fb6']]
  return (
    <motion.div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 30, background: 'var(--gold)' }} exit={{ opacity: 0, y: -30 }} transition={{ duration: .35 }}>
      <div style={{ textAlign: 'center' }}>
        <div className="row" style={{ gap: 6, justifyContent: 'center' }}>
          {tiles.map(([ch, c], i) => (
            <motion.div key={i} initial={{ y: -120, rotate: -30, opacity: 0 }} animate={{ y: 0, rotate: (i % 2 ? 4 : -4), opacity: 1 }} transition={{ delay: i * .08, type: 'spring', stiffness: 380, damping: 14 }}
              style={{ width: 48, height: 56, borderRadius: 10, background: c, border: '3px solid #141414', boxShadow: '4px 4px 0 #141414', display: 'grid', placeItems: 'center', fontFamily: 'var(--display)', fontWeight: 900, fontSize: 34, color: c === '#12805c' || c === '#e5452b' ? '#fff' : '#141414' }}>{ch}</motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .7 }} className="kicker" style={{ marginTop: 22 }}>Michezo ya maneno ya Kiswahili</motion.div>
      </div>
    </motion.div>
  )
}

function Offline() {
  const boot = useStore(s => s.boot)
  const [busy, setBusy] = useState(false)
  return (
    <motion.div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div>
        <motion.div animate={{ rotate: [-6, 6, -6] }} transition={{ repeat: Infinity, duration: 2 }} style={{ display: 'inline-block' }}><Icon name="ban" size={72} /></motion.div>
        <h1 className="display" style={{ fontSize: 48, marginTop: 8 }}>Hakuna <span className="hl red">mtandao.</span></h1>
        <p style={{ fontWeight: 700 }}>Ubongo inahitaji intaneti kuhifadhi alama zako na sarafu.</p>
        <button className="btn gold" disabled={busy} onClick={async () => { setBusy(true); await boot(); setBusy(false) }}><Icon name="refresh" size={18} /> {busy ? 'Inaunganisha…' : 'Jaribu tena'}</button>
      </div>
    </motion.div>
  )
}

function Onboard({ invited }: { invited: boolean }) {
  const s = useStore()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [restore, setRestore] = useState(false)
  const [code, setCode] = useState('')
  const next = () => { sfx.tap(); setStep(x => x + 1) }
  const finish = async (token: string, me: Me) => {
    sfx.win(); s.signIn(token, me)
    // match the phone's dark mode on first launch
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches && me.theme === 'karatasi') s.updateMe({ theme: 'usiku' })
  }
  const create = async () => {
    setBusy(true)
    try { const r = await api<{ token: string; me: Me }>('/auth/guest', { body: { name: s.name, avatar: s.avatar, region: s.region } }); await finish(r.token, r.me) }
    catch (e) { s.fail(e) } finally { setBusy(false) }
  }
  const doRestore = async () => {
    setBusy(true)
    try { const r = await api<{ token: string; me: Me }>('/auth/restore', { body: { code } }); await finish(r.token, r.me); s.notify(`Karibu tena, ${r.me.name}!`, 'key') }
    catch (e) { s.fail(e) } finally { setBusy(false) }
  }
  const slide = { initial: { x: 40, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: -40, opacity: 0 } }
  return (
    <motion.div style={{ position: 'absolute', inset: 0, padding: '54px 20px 26px', display: 'flex', flexDirection: 'column' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="row" style={{ gap: 6, marginBottom: 26 }}>
        {[0, 1, 2].map(i => <motion.div key={i} animate={{ flex: i === step ? 3 : 1, background: i <= step ? 'var(--ink)' : 'var(--soft)' }} style={{ height: 8, borderRadius: 4, border: '2px solid var(--ink)' }} />)}
      </div>
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="0" {...slide} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {invited && <div className="chip gold" style={{ alignSelf: 'flex-start', marginBottom: 12 }}><Icon name="ticket" size={14} /> Umealikwa kwenye changamoto!</div>}
            <div className="row" style={{ gap: 6 }}>{(['fumbua', 'mafumbo', 'windo', 'pangua'] as const).map((g, i) => <motion.div key={g} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1, rotate: (i - 1.5) * 4 }} transition={{ delay: i * .07 }}><GameMark game={g} size={50} /></motion.div>)}</div>
            <h1 className="display" style={{ fontSize: 68, marginTop: 18 }}>Karibu <span className="hl">Ubongo.</span></h1>
            <p style={{ fontWeight: 700, fontSize: 16 }}>Michezo 4 ya maneno. Vita live. Changamoto za WhatsApp. Tukuite nani?</p>
            <input autoFocus className="field" placeholder="Jina lako la mchezo" value={name} maxLength={16} onChange={e => setName(e.target.value)} style={{ height: 60, fontSize: 20, marginTop: 8 }} />
            <div className="grow" />
            {restore ? (
              <div style={{ marginBottom: 12 }}>
                <input className="field" placeholder="UBG-XXXX-XXXX" value={code} onChange={e => setCode(e.target.value.toUpperCase())} style={{ height: 54, letterSpacing: '.05em' }} />
                <button className="btn block" style={{ marginTop: 10 }} disabled={busy || code.length < 10} onClick={doRestore}><Icon name="key" size={18} /> {busy ? 'Inarejesha…' : 'Rejesha akaunti yangu'}</button>
              </div>
            ) : (
              <button className="mute" style={{ fontWeight: 800, marginBottom: 14 }} onClick={() => setRestore(true)}>Nina msimbo wa kurejesha akaunti</button>
            )}
            <button className="btn ink block" disabled={name.trim().length < 2} onClick={() => { s.set({ name: name.trim() }); next() }}>Endelea <Icon name="next" size={18} /></button>
          </motion.div>
        )}
        {step === 1 && (
          <motion.div key="1" {...slide} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h1 className="display" style={{ fontSize: 50 }}>Chagua <span className="hl">mnyama</span> wako.</h1>
            <p style={{ fontWeight: 700 }}>Atakuwakilisha kwenye Ligi na Vita.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 6 }}>
              {AVATARS.map((a, i) => (
                <motion.button whileTap={{ scale: .85 }} key={a} onClick={() => { s.set({ avatar: a }); sfx.pop() }} animate={{ y: s.avatar === a ? -4 : 0, rotate: s.avatar === a ? -6 : (i % 3 - 1) * 3 }}
                  style={{ textAlign: 'center', fontSize: 11, fontWeight: 800 }}>
                  <div style={{ borderRadius: '50%', border: 'var(--line)', boxShadow: s.avatar === a ? '4px 4px 0 var(--ink)' : 'none', overflow: 'hidden', background: 'var(--paper)' }}><AnimalArt id={a} size={68} /></div>
                  <div style={{ marginTop: 3 }}>{ANIMAL_NAMES[a]}</div>
                </motion.button>
              ))}
            </div>
            <div className="grow" />
            <button className="btn ink block" onClick={next}>Endelea <Icon name="next" size={18} /></button>
          </motion.div>
        )}
        {step === 2 && (
          <motion.div key="2" {...slide} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h1 className="display" style={{ fontSize: 50 }}>Unacheza ukiwa <span className="hl red">wapi?</span></h1>
            <p style={{ fontWeight: 700 }}>Pigania mkoa wako kwenye Ligi ya Mikoa.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {REGIONS.map(r => <button key={r} className={`chip ${s.region === r ? 'ink' : ''}`} onClick={() => { s.set({ region: r }); sfx.tap() }} style={{ fontSize: 14, padding: '9px 14px' }}>{r}</button>)}
            </div>
            <div className="grow" />
            <div className="ticket" style={{ marginBottom: 16 }}>
              <div className="t-side">ZAWADI</div>
              <div className="t-body"><b className="display" style={{ fontSize: 22 }}>Zawadi ya kukaribisha</b><div style={{ fontWeight: 800, fontSize: 13 }} className="row"><Icon name="coin" size={18} /> 250 · <Icon name="gem" size={18} /> 10 · <Icon name="bulb" size={18} /> 3 dokezo</div></div>
            </div>
            <button className="btn gold block nudge" disabled={busy} onClick={create}>{busy ? 'Inaandaa…' : 'Tuanze!'} <Icon name="bolt" size={18} fill="#fffdf8" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
