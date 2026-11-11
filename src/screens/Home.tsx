import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { GAMES, GameId, Me, useStore } from '../lib/store'
import { useNav } from '../lib/nav'
import { api } from '../lib/api'
import { dayKey, fmtCountdown, msUntilMidnight, weekDays } from '../lib/rng'
import { sfx } from '../lib/sound'
import { AdBanner, Confetti, Flap, Marquee, TopBar, spring } from '../components/ui'
import { Daladala, GameMark, Icon } from '../components/icons'
import { METHALI } from '../data/words'

const DAYS = ['J3', 'J4', 'J5', 'Al', 'Ij', 'J1', 'J2'] // Jumatatu..Jumapili
const ORDER: GameId[] = ['fumbua', 'mafumbo', 'windo', 'pangua']
type Stats = { online: number; players: number; games_today: number; solved_today: number; duels_live: number }

function greet() {
  const h = (new Date().getUTCHours() + 3) % 24
  return h < 12 ? 'Habari za asubuhi' : h < 16 ? 'Habari za mchana' : h < 19 ? 'Habari za jioni' : 'Usiku mwema'
}

export default function Home() {
  const s = useStore()
  const play = useNav(n => n.play)
  const go = useNav(n => n.go)
  const [clock, setClock] = useState(msUntilMidnight())
  const [boom, setBoom] = useState(0)
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => { const iv = setInterval(() => setClock(msUntilMidnight()), 1000); return () => clearInterval(iv) }, [])
  useEffect(() => { api<Stats>('/stats').then(setStats).catch(() => {}) }, [])
  const todayKey = s.today || dayKey()
  const today = s.daily[todayKey] || {}
  const done = ORDER.filter(g => today[g] !== undefined)
  const chestClaimed = s.chestDay === todayKey
  const bonusClaimed = s.lastBonusDay === todayKey
  const week = weekDays()

  const open = (g: GameId) => { sfx.whoosh(); play(g) }
  const claimBonus = async () => {
    try {
      const r = await api<{ coins: number; me: Me }>('/daily/bonus', { body: {} })
      s.applyMe(r.me); sfx.coin(); setBoom(b => b + 1); s.notify(`+${r.coins} sarafu · Zawadi ya siku`, 'chest')
    } catch (e) { s.fail(e) }
  }
  const claimChest = async () => {
    try {
      const r = await api<{ coins: number; gems: number; me: Me }>('/daily/chest', { body: {} })
      s.applyMe(r.me); sfx.win(); setBoom(b => b + 1); s.notify(`Kasha: +${r.coins} sarafu +${r.gems} almasi`, 'chest')
    } catch (e) { s.fail(e) }
  }

  const ticker = stats ? [
    <><span className="live" /> {stats.online.toLocaleString()} online sasa</>,
    <>Neno la leo limefumbuliwa na {stats.solved_today.toLocaleString()}</>,
    <>Michezo {stats.games_today.toLocaleString()} imechezwa leo</>,
    <>Vita {stats.duels_live} zinaendelea</>,
    <>Wachezaji {stats.players.toLocaleString()}</>,
  ] : [<>Chemsha bongo kwa Kiswahili</>, <>Michezo 4 · Vita · Changamoto</>]

  // daladala route: 4 stops = 4 games, last stop = treasure chest
  const pct = (done.length / 4) * 100
  return (
    <>
      <TopBar />
      <div className="screen">
        <Marquee items={ticker} />
        <motion.div className="hero" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 18 }}>
          <div className="mute" style={{ fontWeight: 800 }}>{greet()}, {s.name}</div>
          <h1 className="display" style={{ marginTop: 6 }}>Chemsha <span className="hl">bongo</span> <span className="hl red">leo.</span></h1>
        </motion.div>

        {/* streak + daily gift */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, background: s.streak ? '#ffe2c4' : 'var(--paper)', color: s.streak ? '#141414' : undefined }}>
          <motion.div animate={{ rotate: [-4, 4, -4], y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 2 }}><Icon name="fire" size={44} fill={s.streak ? '#e5452b' : 'var(--soft)'} /></motion.div>
          <div className="grow">
            <div className="display" style={{ fontSize: 26 }}>Siku {s.streak} mfululizo</div>
            <div className="row" style={{ gap: 4, marginTop: 6 }}>
              {week.map((d, i) => (
                <span key={d} style={{ width: 24, height: 24, borderRadius: 7, display: 'grid', placeItems: 'center', fontSize: 9.5, fontWeight: 900, border: '2px solid #141414', background: s.daily[d] ? '#e5452b' : '#fffdf8', color: s.daily[d] ? '#fff' : '#141414', outline: d === todayKey ? '2px solid #141414' : 'none', outlineOffset: 2 }}>{DAYS[i]}</span>
              ))}
            </div>
          </div>
          <motion.button whileTap={{ scale: .9 }} className="icon-btn" style={{ width: 52, height: 52, background: bonusClaimed ? '#fffdf8' : 'var(--gold)', color: '#141414' }} disabled={bonusClaimed} onClick={claimBonus} aria-label="Zawadi ya siku">
            {bonusClaimed ? <Icon name="check" size={24} /> : <motion.span animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}><Icon name="chest" size={28} fill="#fffdf8" /></motion.span>}
          </motion.button>
        </div>

        {/* daily route */}
        <div className="card" style={{ marginTop: 14 }}>
          <div className="row">
            <div className="grow">
              <div className="kicker"><Icon name="pin" size={13} /> Safari ya leo</div>
              <div style={{ fontWeight: 800, fontSize: 13.5, marginTop: 8 }}>{done.length === 4 ? 'Umefika! Fungua kasha la hazina.' : `Cheza michezo yote 4 — kituo ${done.length}/4`}</div>
            </div>
            {done.length === 4 && !chestClaimed && <button className="btn small gold nudge" onClick={claimChest}>Fungua</button>}
            {chestClaimed && <span className="stamp green" style={{ fontSize: 14 }}>Imepokelewa</span>}
          </div>
          <div className="route">
            <div className="line"><motion.div className="fill" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={spring} /></div>
            {ORDER.map((g, i) => (
              <button key={g} className={`stop ${today[g] !== undefined ? 'done' : ''}`} style={{ left: `calc(14px + (100% - 28px) * ${i / 4})` }} onClick={() => open(g)} aria-label={GAMES[g].name}>
                {today[g] !== undefined ? <Icon name="check" size={12} /> : <span style={{ fontSize: 9, fontWeight: 900 }}>{i + 1}</span>}
              </button>
            ))}
            <div className="stop end" style={{ left: 'calc(100% - 14px)' }}><Icon name="chest" size={18} fill="#fffdf8" /></div>
            <motion.div className="bus" animate={{ left: `calc(14px + (100% - 28px) * ${Math.min(done.length, 3.9) / 4})` }} transition={{ type: 'spring', stiffness: 80, damping: 14 }}>
              <motion.div animate={{ y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: .5 }}><Daladala size={44} /></motion.div>
            </motion.div>
          </div>
        </div>

        {/* games */}
        <div className="h-sec">
          <h2>Michezo</h2>
          <div className="row" style={{ gap: 6, fontSize: 11, fontWeight: 900 }}><span className="mute">NENO JIPYA</span><Flap text={fmtCountdown(clock)} /></div>
        </div>
        <motion.button className={`game-card ${GAMES.fumbua.cls}`} style={{ minHeight: 168 }} onClick={() => open('fumbua')} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {today.fumbua !== undefined && <span className="done-stamp">Leo ✓</span>}
          <span className="kicker" style={{ alignSelf: 'flex-start' }}>Neno la siku #{s.dayIndex}</span>
          <h3>Fumbua</h3>
          <div className="gc-desc">{GAMES.fumbua.desc}</div>
          <span className="chip ink" style={{ alignSelf: 'flex-start', marginTop: 4 }}><Icon name="play" size={12} fill="var(--gold)" /> Cheza</span>
          <div className="gc-mark"><GameMark game="fumbua" size={84} /></div>
        </motion.button>
        <div className="grid2" style={{ marginTop: 12 }}>
          {(['mafumbo', 'windo'] as GameId[]).map((g, i) => (
            <motion.button key={g} className={`mini-card ${GAMES[g].cls}`} onClick={() => open(g)} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0, rotate: i ? .8 : -.8 }} transition={{ delay: .05 * (i + 1) }}>
              {today[g] !== undefined && <span className="done-stamp">Leo ✓</span>}
              <div style={{ display: 'inline-block', background: 'var(--paper)', border: 'var(--line)', borderRadius: 14, padding: 4 }}><GameMark game={g} size={46} /></div>
              <h3>{GAMES[g].name}</h3>
              <p>{GAMES[g].desc}</p>
            </motion.button>
          ))}
        </div>
        <motion.button className={`game-card ${GAMES.pangua.cls}`} style={{ marginTop: 12, minHeight: 140 }} onClick={() => open('pangua')} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .15 }}>
          {today.pangua !== undefined && <span className="done-stamp">Leo ✓</span>}
          <span className="kicker" style={{ alignSelf: 'flex-start' }}>Ngazi {s.panguaLevel}</span>
          <h3>Pangua</h3>
          <div className="gc-desc">{GAMES.pangua.desc}</div>
          <div className="gc-mark"><GameMark game="pangua" size={78} /></div>
        </motion.button>

        {/* vita teaser */}
        <motion.button whileTap={{ scale: .98 }} className="card" onClick={() => go('vita')} style={{ width: '100%', marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: '#141414', color: '#fffdf8', boxShadow: '5px 5px 0 var(--red)' }}>
          <motion.div animate={{ rotate: [-8, 8, -8] }} transition={{ repeat: Infinity, duration: 1.6 }} style={{ color: 'var(--gold)' }}><Icon name="swords" size={40} fill="#e5452b" /></motion.div>
          <div className="grow">
            <div className="display" style={{ fontSize: 26, color: 'var(--gold)' }}>Vita · 1 dhidi ya 1</div>
            <div style={{ fontSize: 13, fontWeight: 700, opacity: .85 }}>Shindana live na mtu halisi au mpe rafiki msimbo</div>
          </div>
          <Icon name="next" size={22} />
        </motion.button>

        <div className="spacer" />
        <AdBanner slot="banner" />

        {!s.pro && (
          <motion.button whileTap={{ scale: .98 }} className="pro-card" style={{ width: '100%', textAlign: 'left', marginTop: 18 }} onClick={() => go('duka', 'pro')}>
            <div className="shine" />
            <div className="row" style={{ position: 'relative' }}>
              <Icon name="crown" size={42} fill="#f5b800" />
              <div className="grow">
                <div className="display" style={{ fontSize: 26, color: 'var(--gold)' }}>Ubongo Kifalme</div>
                <div style={{ fontSize: 13, fontWeight: 700, opacity: .85 }}>Bila matangazo · Sarafu ×2 · Taji la dhahabu</div>
              </div>
              <span className="chip gold">Jiunge</span>
            </div>
          </motion.button>
        )}

        <div className="card" style={{ marginTop: 18, textAlign: 'center', background: 'var(--soft)', boxShadow: 'none', borderStyle: 'dashed' }}>
          <div className="kicker">Methali ya siku</div>
          <div className="display" style={{ fontSize: 26, marginTop: 10, textTransform: 'none', lineHeight: 1.05 }}>“{METHALI[s.dayIndex % METHALI.length]}”</div>
        </div>
      </div>
      <Confetti fire={boom} />
    </>
  )
}
