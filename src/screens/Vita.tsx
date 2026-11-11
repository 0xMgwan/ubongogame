// Vita — live 1v1 duels (queue / private room / ghost) + the player's challenge links.
import { AnimatePresence, motion } from 'framer-motion'
import { Fragment, useEffect, useRef, useState } from 'react'
import { GAMES, useStore } from '../lib/store'
import { useNav } from '../lib/nav'
import { api } from '../lib/api'
import type { RunView } from '../lib/runs'
import { sfx } from '../lib/sound'
import { Avatar, Confetti, TopBar, spring } from '../components/ui'
import { DuelState } from '../components/duel'
import { GameMark, Icon } from '../components/icons'
import Fumbua from '../games/Fumbua'
import Windo from '../games/Windo'

type DuelGame = 'windo' | 'fumbua'
type Full = DuelState & { myRun: RunView | null }
type Challenges = {
  sent: { code: string; game: string; score: number; plays: number; rows: { name: string; avatar: string; score: number; creator: boolean }[] }[]
  played: { code: string; game: string; creatorScore: number; score: number | null; creator: { name: string; avatar: string } }[]
}

export default function Vita() {
  const s = useStore()
  const [game, setGame] = useState<DuelGame>('windo')
  const [duel, setDuel] = useState<Full | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [ch, setCh] = useState<Challenges | null>(null)
  const openChallenge = useNav(n => n.openChallenge)
  const poll = useRef<number>()

  useEffect(() => { api<Challenges>('/challenges').then(setCh).catch(() => {}) }, [])
  // poll the duel while it's open (≈1s while live, slower while waiting)
  useEffect(() => {
    if (!duel || duel.status === 'done' || duel.status === 'cancelled') return
    const t = window.setTimeout(async () => {
      try {
        const sent = Date.now()
        const d = await api<Full>(`/duels/${duel.id}`)
        const skew = d.now - (sent + Date.now()) / 2
        if (d.status === 'live' && duel.status === 'waiting') sfx.great()
        if (d.status === 'done' && d.outcome) { d.outcome === 'win' ? sfx.win() : sfx.bad(); s.boot() }
        setDuel({ ...d, skew })
      } catch (e) { s.fail(e) }
    }, duel.status === 'live' ? 900 : 1500)
    poll.current = t
    return () => clearTimeout(t)
  }, [duel])

  const start = async (mode: 'queue' | 'room' | 'ghost' | 'join') => {
    setBusy(true)
    try {
      const sent = Date.now()
      const d = await api<Full>('/duels', { body: { game, mode, code: mode === 'join' ? code : undefined } })
      setDuel({ ...d, skew: d.now - (sent + Date.now()) / 2 }); sfx.whoosh()
    } catch (e: any) { s.fail(e) } finally { setBusy(false) }
  }
  const toGhost = async () => {
    if (!duel) return
    try { const d = await api<Full>(`/duels/${duel.id}/ghost`, { body: {} }); setDuel({ ...d, skew: duel.skew }) } catch (e) { s.fail(e) }
  }
  const leave = async () => {
    if (duel?.status === 'waiting') await api(`/duels/${duel.id}/cancel`, { body: {} }).catch(() => {})
    if (duel?.status === 'live' && !confirm('Ukiondoka sasa utapoteza vita hii. Uondoke?')) return
    setDuel(null)
  }
  const shareRoom = (c: string) => {
    const text = `Nakuita VITA kwenye Ubongo (${GAMES[duel!.game].name})! Fungua ${location.origin} → Vita → ingiza msimbo: ${c}`
    if (navigator.share) navigator.share({ text }).catch(() => {}); else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  // ---------------- live / done ----------------
  if (duel && (duel.status === 'live' || duel.status === 'done') && duel.myRun) {
    const G = duel.game === 'windo' ? Windo : Fumbua
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 12, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
        <G key={duel.myRun.id} run={duel.myRun} duel={duel} onLeave={leave} />
        <AnimatePresence>{duel.status === 'done' && <DuelResult duel={duel} onAgain={() => { setDuel(null); setTimeout(() => start('queue'), 50) }} onExit={() => setDuel(null)} />}</AnimatePresence>
      </div>
    )
  }

  return (
    <>
      <TopBar />
      <div className="screen">
        <div style={{ margin: '4px 0 14px' }}>
          <span className="kicker"><Icon name="swords" size={13} /> 1 dhidi ya 1 · live</span>
          <h1 className="display" style={{ fontSize: 60, marginTop: 10 }}>Vita ya <span className="hl red">bongo.</span></h1>
          <p className="mute" style={{ fontWeight: 700, margin: '8px 0 0' }}>Ubao mmoja, saa moja. Mshindi anachukua sarafu 50.</p>
        </div>

        <AnimatePresence mode="wait">
          {!duel || duel.status === 'cancelled' ? (
            <motion.div key="lobby" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid2">
                {(['windo', 'fumbua'] as DuelGame[]).map(g => (
                  <motion.button key={g} whileTap={{ scale: .97 }} className={`mini-card ${GAMES[g].cls}`} onClick={() => { setGame(g); sfx.tap() }}
                    animate={{ rotate: game === g ? -1.5 : 0, y: game === g ? -3 : 0 }}
                    style={{ boxShadow: game === g ? '6px 6px 0 var(--ink)' : '2px 2px 0 var(--ink)', opacity: game === g ? 1 : .65 }}>
                    {game === g && <span className="done-stamp" style={{ color: 'var(--ink)', borderColor: 'var(--ink)' }}>Chaguo</span>}
                    <div style={{ display: 'inline-block', background: 'var(--paper)', border: 'var(--line)', borderRadius: 14, padding: 4 }}><GameMark game={g} size={44} /></div>
                    <h3>{GAMES[g].name}</h3>
                    <p>{g === 'windo' ? 'Sekunde 90 · alama nyingi zinashinda' : 'Neno moja · anayefumbua kwanza anashinda'}</p>
                  </motion.button>
                ))}
              </div>
              <button className="btn red block nudge" style={{ marginTop: 18, height: 60, fontSize: 18 }} disabled={busy} onClick={() => start('queue')}>
                <Icon name="search" size={22} fill="#fff" /> Tafuta mpinzani
              </button>
              <div className="grid2" style={{ marginTop: 12 }}>
                <button className="btn" disabled={busy} onClick={() => start('room')}><Icon name="users" size={20} /> Unda chumba</button>
                <button className="btn" disabled={busy} onClick={() => start('ghost')}><Icon name="ghost" size={20} /> Kivuli</button>
              </div>
              <div className="card" style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center', padding: 10 }}>
                <Icon name="key" size={24} />
                <input className="field" style={{ height: 44, letterSpacing: '.3em', fontFamily: 'var(--display)', fontSize: 20, textTransform: 'uppercase' }} maxLength={4} placeholder="ABCD" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} />
                <button className="btn small ink" disabled={busy || code.length !== 4} onClick={() => start('join')}>Ingia</button>
              </div>
              <div className="row" style={{ justifyContent: 'center', gap: 16, marginTop: 14, fontWeight: 800, fontSize: 13 }}>
                <span><Icon name="trophy" size={16} /> Ushindi {s.duelWins}</span><span className="mute">Vita {s.duelPlayed}</span>
              </div>
            </motion.div>
          ) : (
            <Waiting key="wait" duel={duel} onGhost={toGhost} onCancel={leave} onShare={shareRoom} />
          )}
        </AnimatePresence>

        {/* challenge links */}
        <div className="h-sec"><h2>Changamoto</h2><span className="mute" style={{ fontSize: 12, fontWeight: 800 }}>Tuma kiungo WhatsApp</span></div>
        {!ch || (!ch.sent.length && !ch.played.length) ? (
          <div className="card" style={{ borderStyle: 'dashed', boxShadow: 'none', textAlign: 'center' }}>
            <Icon name="ticket" size={40} />
            <p style={{ fontWeight: 700, margin: '6px 0 0' }}>Maliza mchezo wowote, kisha bonyeza <b>“Mpe rafiki changamoto”</b>. Watacheza ubao wako huo huo.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {ch.sent.map(c => (
              <button key={c.code} className="card" onClick={() => openChallenge(c.code)} style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: 12 }}>
                <div style={{ background: GAMES[c.game as keyof typeof GAMES].color, border: 'var(--line)', borderRadius: 12, padding: 3 }}><GameMark game={c.game} size={34} /></div>
                <div className="grow">
                  <b>Yako · {GAMES[c.game as keyof typeof GAMES].name} · {c.score.toLocaleString()}</b>
                  <div className="mute" style={{ fontSize: 12, fontWeight: 700 }}>{c.plays ? `${c.plays} wamecheza · kinara: ${c.rows[0]?.name}` : 'Bado hakuna aliyecheza'}</div>
                </div>
                <Icon name="next" size={18} />
              </button>
            ))}
            {ch.played.map(c => (
              <button key={c.code} className="card" onClick={() => openChallenge(c.code)} style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: 12, boxShadow: 'none' }}>
                <Avatar size={38} avatar={c.creator.avatar} frame="none" />
                <div className="grow">
                  <b>Ya {c.creator.name} · {GAMES[c.game as keyof typeof GAMES].name}</b>
                  <div className="mute" style={{ fontSize: 12, fontWeight: 700 }}>{c.score === null ? 'Bado hujamaliza' : c.score > c.creatorScore ? `Umemshinda (${c.score} vs ${c.creatorScore})` : `${c.score} vs ${c.creatorScore}`}</div>
                </div>
                {c.score !== null && c.score > c.creatorScore && <span className="chip green">Ushindi</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function Waiting({ duel, onGhost, onCancel, onShare }: { duel: Full; onGhost: () => void; onCancel: () => void; onShare: (c: string) => void }) {
  const canGhost = duel.kind === 'queue' && duel.waitedMs > 12000
  return (
    <motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center' }}>
      {duel.kind === 'room' && duel.roomCode ? (
        <div className="ticket" style={{ margin: '6px 4px 18px', textAlign: 'left' }}>
          <div className="t-side">CHUMBA · VITA</div>
          <div className="t-body">
            <small style={{ fontWeight: 900, letterSpacing: '.14em', fontSize: 11 }}>MSIMBO WA CHUMBA · {GAMES[duel.game].name.toUpperCase()}</small>
            <div className="display" style={{ fontSize: 72, letterSpacing: '.12em' }}>{duel.roomCode}</div>
            <div className="barcode" />
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative', width: 180, height: 180, margin: '10px auto 18px' }}>
          {[0, 1, 2].map(i => (
            <motion.div key={i} style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid var(--ink)' }}
              animate={{ scale: [0.4, 1.15], opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 2, delay: i * .66, ease: 'easeOut' }} />
          ))}
          <div style={{ position: 'absolute', inset: 50, borderRadius: '50%', background: 'var(--gold)', border: 'var(--line)', display: 'grid', placeItems: 'center', boxShadow: 'var(--shadow)' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2.4, ease: 'linear' }}><Icon name="search" size={40} fill="#fffdf8" /></motion.div>
          </div>
        </div>
      )}
      <div className="display" style={{ fontSize: 30 }}>{duel.kind === 'room' ? 'Tuma msimbo kwa rafiki' : 'Tunatafuta mpinzani…'}</div>
      <p className="mute" style={{ fontWeight: 700 }}>{duel.kind === 'room' ? 'Vita itaanza mara tu atakapoingia.' : `${Math.floor(duel.waitedMs / 1000)}s · ${GAMES[duel.game].name}`}</p>
      {duel.kind === 'room' && duel.roomCode && <button className="btn green block" onClick={() => onShare(duel.roomCode!)}><Icon name="whatsapp" size={22} /> Tuma WhatsApp</button>}
      <AnimatePresence>{canGhost && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ marginTop: 14, textAlign: 'left', display: 'flex', gap: 10, alignItems: 'center' }}>
          <Icon name="ghost" size={34} />
          <div className="grow"><b>Hakuna mtu online sasa hivi</b><div className="mute" style={{ fontSize: 12.5, fontWeight: 700 }}>Shindana na rekodi halisi ya mchezaji mwingine</div></div>
          <button className="btn small gold" onClick={onGhost}>Cheza</button>
        </motion.div>
      )}</AnimatePresence>
      <button className="mute" style={{ marginTop: 16, fontWeight: 800 }} onClick={onCancel}>Ghairi</button>
    </motion.div>
  )
}

function DuelResult({ duel, onAgain, onExit }: { duel: Full; onAgain: () => void; onExit: () => void }) {
  const s = useStore()
  const [boom, setBoom] = useState(0)
  useEffect(() => { if (duel.outcome === 'win') setTimeout(() => setBoom(1), 500) }, [])
  const me = duel.me!, opp = duel.opp!
  const val = (x: typeof me) => (duel.game === 'windo' ? x.score.toLocaleString() : x.solved ? `${x.guesses}/6` : 'X/6')
  const posters = [
    { name: s.name, avatar: s.avatar, frame: s.frame, v: val(me), win: duel.outcome === 'win', bg: '#7ed6a8', r: -3 },
    { name: opp.player.name, avatar: opp.player.avatar, frame: opp.player.frame, v: val(opp as any), win: duel.outcome === 'lose', bg: '#ff8f7a', r: 3, ghost: opp.ghost },
  ]
  return (
    <motion.div className="scrim center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ zIndex: 60 }}>
      <motion.div className="dialog" initial={{ scale: .8, rotate: -3 }} animate={{ scale: 1, rotate: 0 }} transition={spring} style={{ textAlign: 'center' }}>
        <div className="kicker"><Icon name="swords" size={13} /> Matokeo ya vita · {GAMES[duel.game].name}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 6, margin: '22px 0 14px' }}>
          {posters.map((p, i) => (
            <Fragment key={i}>
              {i === 1 && <div className="vs">VS</div>}
              <motion.div className="poster" style={{ background: p.bg, transform: `rotate(${p.r}deg)` }} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .1 + i * .15 }}>
                <Avatar size={58} avatar={p.avatar} frame={p.frame} />
                <div className="p-name">{p.name}{p.ghost && <div style={{ fontSize: 11, fontFamily: 'var(--body)' }}>(rekodi)</div>}</div>
                <div className="display" style={{ fontSize: 30 }}>{p.v}</div>
                {p.win && <motion.span className="stamp" style={{ position: 'absolute', top: 30, fontSize: 18 }} initial={{ scale: 2.4, opacity: 0, rotate: -14 }} animate={{ scale: 1, opacity: 1, rotate: -14 }} transition={{ delay: .7, type: 'spring', stiffness: 500, damping: 16 }}>Mshindi</motion.span>}
              </motion.div>
            </Fragment>
          ))}
        </div>
        <h2 className="display" style={{ fontSize: 44 }}>{duel.outcome === 'win' ? 'Umeshinda!' : duel.outcome === 'lose' ? 'Umepigwa!' : 'Sare!'}</h2>
        {duel.outcome === 'win' && <p style={{ fontWeight: 900, margin: '4px 0 0' }}><Icon name="coin" size={18} /> +{duel.reward} sarafu</p>}
        {duel.game === 'fumbua' && opp.answer && <p className="mute" style={{ fontWeight: 700 }}>Neno lilikuwa “{opp.answer.toUpperCase()}”</p>}
        <div className="row" style={{ gap: 10, marginTop: 16 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onExit}>Rudi</button>
          <button className="btn red" style={{ flex: 1.4 }} onClick={onAgain}>Vita tena <Icon name="swords" size={18} fill="#fff" /></button>
        </div>
      </motion.div>
      <Confetti fire={boom} />
    </motion.div>
  )
}
