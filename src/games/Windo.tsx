import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { WINDO_N as N, makeWindoBoard } from '../lib/boards'
import { useStore } from '../lib/store'
import { useNav } from '../lib/nav'
import { api } from '../lib/api'
import { RunView, finishRun, startRun, useRunItem } from '../lib/runs'
import { WINDO_EXTRA, WINDO_TIME as TIME, windoPts as PTS } from '../shared/rules'
import { sfx } from '../lib/sound'
import { useTrace } from '../lib/useTrace'
import { GameHead, GameLoading, PowerBtn, Result, ResultSheet, SponsorStrip, baseResult } from '../components/ui'
import { DuelCountdown, DuelState, OppBar, serverNow } from '../components/duel'
import { Icon } from '../components/icons'

export default function Windo({ run: given, duel, onLeave }: { run?: RunView | null; duel?: DuelState; onLeave?: () => void }) {
  const [run, setRun] = useState<RunView | null>(given ?? null)
  const [err, setErr] = useState<string | null>(null)
  const load = async () => {
    setErr(null); setRun(null)
    try { setRun((await startRun('windo')).run) } catch (e: any) { setErr(e.message) }
  }
  useEffect(() => { if (!given) load() }, [])
  if (!run) return <><GameHead game="windo" onBack={onLeave} /><GameLoading error={err} retry={load} /></>
  return <Board key={run.id} run={run} duel={duel} onNext={load} onLeave={onLeave} />
}

function Board({ run, duel, onNext, onLeave }: { run: RunView; duel?: DuelState; onNext: () => void; onLeave?: () => void }) {
  const s = useStore()
  const play = useNav(n => n.play)
  const board = useMemo(() => makeWindoBoard(run.seed!), [run.seed])
  const [found, setFound] = useState<string[]>(run.found ?? [])
  const [score, setScore] = useState((run.found ?? []).reduce((a, w) => a + PTS(w.length), 0))
  const [extra, setExtra] = useState(run.extra ?? 0)
  const [now, setNow] = useState(Date.now())
  const [flash, setFlash] = useState<{ id: number; text: string; pts: number } | null>(null)
  const [combo, setCombo] = useState(0)
  const lastFind = useRef(0)
  const [result, setResult] = useState<Result | null>(null)
  const [frozenUntil, setFrozenUntil] = useState(0)
  const [ending, setEnding] = useState(false)
  const boardPx = Math.min(window.innerWidth, 440) - 32
  const cell = (boardPx - 25 - 10 * (N - 1)) / N

  // the clock is the server's: run.startedAt (+ extra seconds bought), corrected for skew in duels
  const clockNow = duel ? serverNow(duel) : now
  const left = Math.max(0, Math.ceil((run.startedAt + (TIME + extra) * 1000 - clockNow) / 1000))
  const started = clockNow >= run.startedAt
  const frozen = now < frozenUntil
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(iv) }, [])
  useEffect(() => { if (left <= 5 && left > 0 && started) sfx.key() }, [left])
  useEffect(() => { if (left <= 0 && started && !result && !ending) end() }, [left, started])

  const end = async () => {
    if (ending) return
    setEnding(true)
    let r
    try { r = await finishRun(run.id, { words: found }) } catch (e: any) {
      if (e?.code === 'duel_running') { setTimeout(() => setEnding(false), 1500); return }
      s.fail(e); setEnding(false); return
    }
    if (duel) return // Vita shows the duel result
    sfx.win()
    const missed = r.missed ?? []
    setResult({
      ...baseResult(r, run),
      title: r.score >= 3000 ? 'Mwindaji Hodari!' : r.score >= 1200 ? 'Safi sana!' : 'Umejitahidi!', stamp: r.score >= 1200 ? 'Windo!' : 'Umewinda',
      sub: `Maneno ${found.length} kati ya ${r.total ?? board.words.size}${missed.length ? ` · Ulikosa: ${missed.slice(0, 3).map(w => w.toUpperCase()).join(', ')}` : ''}`,
      share: `Ubongo · Windo alama ${r.score} · maneno ${found.length}/${r.total ?? board.words.size} 🏹 ${location.origin}`,
      stats: [['Neno refu', (found.slice().sort((a, b) => b.length - a.length)[0] ?? '—').toUpperCase()], ['Maneno', `${found.length}`]],
    })
  }

  const word = (p: number[]) => p.map(i => board.grid[i]).join('')
  const centers = () => Array.from({ length: N * N }, (_, i) => ({ x: 12 + (i % N) * (cell + 10) + cell / 2, y: 12 + Math.floor(i / N) * (cell + 10) + cell / 2 }))
  const { ref, path, handlers } = useTrace({
    centers, radius: () => cell * 0.42,
    canAdd: (p, i) => { const a = p[p.length - 1]; return Math.abs(Math.floor(a / N) - Math.floor(i / N)) <= 1 && Math.abs((a % N) - (i % N)) <= 1 },
    onAdd: p => sfx.chain(p.length),
    onEnd: p => {
      if (result || ending || left <= 0 || !started) return
      const w = word(p)
      if (w.length < 3) return
      if (found.includes(w)) { sfx.bad(); setFlash({ id: Date.now(), text: 'Tayari!', pts: 0 }); return }
      if (!board.words.has(w)) { sfx.bad(); setCombo(0); return }
      const t = Date.now()
      const c = t - lastFind.current < 3500 ? combo + 1 : 0
      lastFind.current = t; setCombo(c)
      setFound(f => [...f, w]); setScore(x => x + PTS(w.length))
      setFlash({ id: t, text: w, pts: PTS(w.length) }); w.length >= 5 ? sfx.great() : sfx.good()
      // record it server-side (timestamped — powers live duels and ghost replays)
      api(`/runs/${run.id}/word`, { body: { word: w } }).catch(e => { if (e?.code !== 'time_up') console.warn(e) })
    },
  })
  const cur = word(path)
  const curState = cur.length >= 3 ? (found.includes(cur) ? 'dup' : board.words.has(cur) ? 'ok' : '') : ''

  const addTime = async () => {
    if (result || ending || left <= 0) return
    if (!(await useRunItem(run.id, 'muda'))) return
    setExtra(x => x + WINDO_EXTRA); sfx.coin(); s.notify('+30 sekunde!', 'clock')
  }
  const bomb = async () => {
    if (result || frozen || ending) return
    if (!(await useRunItem(run.id, 'bomu'))) return
    const w = [...board.words.keys()].filter(x => !found.includes(x)).sort((a, b) => b.length - a.length)[0]
    if (w) s.notify(`Jaribu: ${w[0].toUpperCase()}${'•'.repeat(w.length - 1)} (${w.length})`, 'bomb')
    setExtra(x => x + 5); setFrozenUntil(Date.now() + 5000)
  }

  const total = TIME + extra
  const R = 25, C = 2 * Math.PI * R
  const pts = path.map(i => centers()[i])

  return (
    <>
      <GameHead game="windo" onBack={onLeave} sub={duel ? 'Vita · alama nyingi zinashinda' : `${found.length} / ${board.words.size} maneno yamefichwa`}
        right={duel ? undefined : <div className="row" style={{ gap: 6 }}>
          <PowerBtn icon="clock" count={s.inv.muda} onClick={addTime} label="+30s" />
          <PowerBtn icon="bomb" count={s.inv.bomu} onClick={bomb} label="Dokezo" />
        </div>} />
      <div className="g-body">
        {duel && <OppBar duel={duel} myScore={score} />}
        <div className="row" style={{ justifyContent: 'space-between', margin: '2px 0 6px' }}>
          <div>
            <div className="kicker" style={{ padding: '2px 8px' }}>Alama</div>
            <motion.div key={score} initial={{ scale: 1.3, rotate: -4 }} animate={{ scale: 1, rotate: 0 }} className="display" style={{ fontSize: 44, marginTop: 4 }}>{score.toLocaleString()}</motion.div>
          </div>
          <AnimatePresence>{combo > 0 && (
            <motion.div key={combo} initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: -6 }} exit={{ scale: 0 }} className="chip red" style={{ fontSize: 14 }}><Icon name="fire" size={16} fill="var(--gold)" /> Combo ×{combo + 1}</motion.div>
          )}</AnimatePresence>
          <div className="timer">
            <svg width="60" height="60"><circle cx="30" cy="30" r={R} stroke="var(--soft)" strokeWidth="7" fill="var(--paper)" />
              <circle cx="30" cy="30" r={R} stroke={frozen ? 'var(--sky)' : left <= 10 ? 'var(--red)' : 'var(--blue)'} strokeWidth="7" fill="none" strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(1, left / total))} style={{ transition: 'stroke-dashoffset .25s linear' }} />
              <circle cx="30" cy="30" r={R + 4.5} stroke="var(--ink)" strokeWidth="2.5" fill="none" /></svg>
            <div className="t" style={{ color: left <= 10 ? 'var(--red)' : undefined }}>{frozen ? <Icon name="clock" size={22} /> : left}</div>
          </div>
        </div>

        <div className="word-preview">
          <AnimatePresence mode="popLayout">
            {cur ? (
              <motion.div key="cur" className="wp" initial={{ scale: .8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                style={{ background: curState === 'ok' ? 'var(--green)' : curState === 'dup' ? 'var(--gold)' : undefined, color: curState === 'ok' ? '#fff' : undefined }}>
                {cur}{curState === 'ok' && <span style={{ fontSize: 15, marginLeft: 8 }}>+{PTS(cur.length)}</span>}
              </motion.div>
            ) : flash ? (
              <motion.div key={flash.id} className="wp" initial={{ y: 0, opacity: 1, scale: 1.1, rotate: -3 }} animate={{ y: -30, opacity: 0 }} transition={{ duration: 1.1 }}
                style={{ background: flash.pts ? 'var(--green)' : 'var(--gold)', color: flash.pts ? '#fff' : '#141414' }}>
                {flash.pts ? `${flash.text} +${flash.pts}` : flash.text}
              </motion.div>
            ) : (
              <motion.div key="hint" className="row mute" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontWeight: 800, gap: 6 }}><Icon name="tap" size={20} /> Telezesha kuunganisha herufi</motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="wh-board" style={{ width: boardPx }} ref={ref} {...handlers}>
          <svg className="wh-svg" width={boardPx} height={boardPx} style={{ overflow: 'visible' }}>
            {pts.length > 1 && <polyline points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#141414" strokeOpacity=".85" strokeWidth={cell * 0.16} strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
          <div className="wh-grid" style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}>
            {board.grid.map((ch, i) => (
              <motion.div key={run.id + i} className={`wh-cell ${path.includes(i) ? 'sel ' + curState : ''}`}
                initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: i * 0.025, type: 'spring', stiffness: 400, damping: 20 }}
                style={{ fontSize: cell * 0.46 }}>
                {ch}
              </motion.div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxHeight: 72, overflow: 'hidden' }}>
          {found.slice().reverse().map(w => (
            <motion.span key={w} layout initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} className="chip" style={{ textTransform: 'uppercase' }}>{w}</motion.span>
          ))}
        </div>
        <div style={{ marginTop: 'auto' }}>
          {!duel && started && !result && <button className="btn small block" disabled={ending} onClick={end} style={{ marginBottom: 6 }}>Maliza mapema</button>}
          {duel && ending && <div style={{ textAlign: 'center', fontWeight: 900 }}>Muda umeisha — tunahesabu…</div>}
          {!duel && <SponsorStrip slot="wh" />}
        </div>
      </div>
      {duel && <DuelCountdown duel={duel} />}
      {!duel && <ResultSheet game="windo" result={result} onAgain={onNext} onExit={() => (onLeave ? onLeave() : play(null))} />}
    </>
  )
}
