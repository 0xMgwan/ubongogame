import { motion, useAnimationControls } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { LEXSET } from '../data/words'
import { fmtCountdown, msUntilMidnight } from '../lib/rng'
import { Me, useStore } from '../lib/store'
import { useNav } from '../lib/nav'
import { api } from '../lib/api'
import { RunView, ServerResult, startRun, useRunItem } from '../lib/runs'
import { sfx } from '../lib/sound'
import { Flap, GameHead, GameLoading, PowerBtn, Result, ResultSheet, SponsorStrip, baseResult } from '../components/ui'
import { DuelCountdown, DuelState, DuelTimeBar, OppBar } from '../components/duel'
import { Icon } from '../components/icons'
import { KEY_ROWS as ROWS, PhoneKeyboard } from '../components/keys'

type Mark = 'correct' | 'present' | 'absent'
type Guess = { word: string; marks: Mark[] }
const TITLES = ['Gwiji!', 'Hodari sana!', 'Safi kabisa!', 'Vizuri!', 'Umeweza!', 'Phew!']

export default function Fumbua({ run: given, duel, onLeave }: { run?: RunView | null; duel?: DuelState; onLeave?: () => void }) {
  const [run, setRun] = useState<RunView | null>(given ?? null)
  const [err, setErr] = useState<string | null>(null)
  const [first, setFirst] = useState<ServerResult | null>(null)
  const load = async (mode?: 'daily') => {
    setErr(null); setRun(null); setFirst(null)
    try { const r = await startRun('fumbua', mode); setFirst(r.result); setRun(r.run) } catch (e: any) { setErr(e.message) }
  }
  useEffect(() => { if (!given) load('daily') }, [])
  if (!run) return <><GameHead game="fumbua" onBack={onLeave} /><GameLoading error={err} retry={() => load('daily')} /></>
  return <Board key={run.id} run={run} initialResult={first} duel={duel} onNext={() => load()} onLeave={onLeave} />
}

function Board({ run: initial, initialResult, duel, onNext, onLeave }: { run: RunView; initialResult: ServerResult | null; duel?: DuelState; onNext: () => void; onLeave?: () => void }) {
  const s = useStore()
  const play = useNav(n => n.play)
  const [run, setRun] = useState(initial)
  const [guesses, setGuesses] = useState<Guess[]>(initial.guesses ?? [])
  const [cur, setCur] = useState('')
  const [busy, setBusy] = useState(false)
  const [revealing, setRevealing] = useState(-1)
  const [revealN, setRevealN] = useState(5)
  const [result, setResult] = useState<Result | null>(null)
  const [showRes, setShowRes] = useState(!initialResult)
  const [clock, setClock] = useState(msUntilMidnight())
  const shake = useAnimationControls()

  const toResult = (r: ServerResult, gs: Guess[], v: RunView): Result => {
    const n = gs.length
    const grid = gs.map(g => g.marks.map(m => (m === 'correct' ? '🟩' : m === 'present' ? '🟨' : '⬛')).join('')).join('\n')
    const answer = (v.answer ?? r.answer ?? '').toUpperCase()
    return {
      ...baseResult(r, v),
      title: r.won ? TITLES[n - 1] : 'Pole sana!', stamp: r.won ? 'Imefumbuliwa' : 'Bado!',
      sub: r.won ? `Umefumbua "${answer}" kwa majaribio ${n}` : `Neno lilikuwa "${answer}"`,
      share: `Ubongo · Fumbua ${v.mode === 'daily' ? '#' + v.dayIndex : ''} ${r.won ? n : 'X'}/6\n\n${grid}\n\nCheza nami 🧠 ${location.origin}`,
      stats: v.mode === 'daily' ? [['Mfululizo', `${useStore.getState().streak} siku`]] : undefined,
    }
  }
  useEffect(() => { if (initialResult) setResult(toResult(initialResult, initial.guesses ?? [], initial)) }, [])
  useEffect(() => { const iv = setInterval(() => setClock(msUntilMidnight()), 1000); return () => clearInterval(iv) }, [])

  const over = run.done
  const keyMarks = useMemo(() => {
    const m: Record<string, Mark> = {}
    const rank = { absent: 0, present: 1, correct: 2 }
    guesses.forEach((g, gi) => {
      if (gi === revealing) return
      g.marks.forEach((mk, i) => { const k = g.word[i]; if (!m[k] || rank[mk] > rank[m[k]]) m[k] = mk })
    })
    return m
  }, [guesses, revealing])

  const bump = (msg: string) => { sfx.bad(); shake.start({ x: [0, -10, 10, -8, 8, 0], transition: { duration: .35 } }); s.notify(msg, 'ban') }

  const submit = async () => {
    if (over || busy || revealing >= 0) return
    if (cur.length < 5) return bump('Herufi hazitoshi')
    if (!LEXSET.has(cur)) return bump('Neno halipo kamusini')
    setBusy(true)
    try {
      const r = await api<{ marks: Mark[]; run: RunView; result: ServerResult | null; me: Me }>(`/runs/${run.id}/guess`, { body: { word: cur } })
      const gs = [...guesses, { word: cur, marks: r.marks }]
      setGuesses(gs); setCur(''); setRevealing(gs.length - 1); setRevealN(0)
      r.marks.forEach((_, i) => setTimeout(() => { sfx.flip(i); setRevealN(i + 1) }, i * 260 + 250))
      setTimeout(() => setRevealing(-1), 5 * 260 + 300)
      setRun(r.run)
      if (r.result) {
        if (r.result.won) setTimeout(() => sfx.great(), 1500)
        const res = r.result
        setTimeout(() => { s.applyMe(r.me); if (!duel) { setShowRes(true); setResult(toResult(res, gs, r.run)) } }, 1700)
      } else s.applyMe(r.me)
    } catch (e: any) {
      if (e.code === 'not_a_word' || e.code === 'bad_length') bump(e.message); else s.fail(e)
    } finally { setBusy(false) }
  }
  const type = (k: string) => {
    if (over || revealing >= 0) return
    if (k === 'enter') { submit(); return }
    if (k === 'del') { setCur(c => c.slice(0, -1)); sfx.key(); return }
    setCur(c => (c.length < 5 ? c + k : c)); sfx.key()
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.key === 'Enter') type('enter'); else if (e.key === 'Backspace') type('del')
      else if (/^[a-z]$/i.test(e.key)) type(e.key.toLowerCase())
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  })

  const hint = async () => {
    if (over) return
    const r = await useRunItem(run.id, 'dokezo')
    if (r?.reveal) { setRun(r.run); sfx.pop(); s.notify(`Herufi ya ${r.reveal.index + 1} ni "${r.reveal.letter.toUpperCase()}"`, 'bulb') }
  }

  const hints = run.hints ?? {}
  const rows = Array.from({ length: 6 }, (_, r) => (r < guesses.length ? guesses[r].word : r === guesses.length ? cur : ''))
  const sub = duel ? 'Vita · nani atafumbua kwanza?' : run.mode === 'daily' ? `Neno la Siku #${run.dayIndex}` : run.mode === 'challenge' ? 'Changamoto ya rafiki' : 'Mazoezi · bila kikomo'

  return (
    <>
      <GameHead game="fumbua" sub={sub} onBack={onLeave}
        right={<div className="row" style={{ gap: 6 }}>
          <PhoneKeyboard onKey={type} />
          {!duel && <PowerBtn icon="bulb" count={s.inv.dokezo} onClick={hint} label="Dokezo" />}
        </div>} />
      <div className="g-body">
        {duel && <><OppBar duel={duel} /><DuelTimeBar duel={duel} /></>}
        {!duel && (
          <div className="fb-info">
            <span className="chip ink">Jaribio {Math.min(guesses.length + (over ? 0 : 1), 6)}/6</span>
            {Object.keys(hints).length > 0 ? (
              <span className="row" style={{ gap: 3 }} title="Herufi za dokezo">
                <Icon name="bulb" size={16} />
                {[0, 1, 2, 3, 4].map(i => <i key={i} className={`fb-hint ${hints[i] ? 'on' : ''}`}>{hints[i] ?? ''}</i>)}
              </span>
            ) : (
              <span className="fb-legend">
                <span><i className="correct" />Sahihi</span><span><i className="present" />Ipo, si hapa</span><span><i className="absent" />Haipo</span>
              </span>
            )}
          </div>
        )}
        <div className="fb-board">
          {rows.map((word, r) => {
            const submitted = r < guesses.length
            const marks = submitted ? guesses[r].marks : []
            const isWinRow = submitted && marks.every(m => m === 'correct') && revealing < 0
            return (
              <motion.div key={r} className="fb-row" animate={r === guesses.length ? shake : undefined}>
                {[0, 1, 2, 3, 4].map(i => {
                  const ch = word[i] ?? ''
                  const flipping = r === revealing
                  return (
                    <motion.div key={i + ':' + (submitted ? 's' : 'o')}
                      className={`fb-tile ${ch ? 'filled' : ''} ${submitted && (!flipping || i < revealN) ? marks[i] : ''}`}
                      initial={submitted && flipping ? { rotateX: 0 } : ch && !submitted ? { scale: .8 } : false}
                      animate={submitted && flipping ? { rotateX: [0, 90, 0] } : isWinRow ? { y: [0, -18, 0], rotateX: 0 } : { scale: 1, rotateX: 0 }}
                      transition={submitted && flipping ? { delay: i * .26, duration: .5, times: [0, .5, 1] } : isWinRow ? { delay: i * .09, duration: .45 } : { type: 'spring', stiffness: 600, damping: 18 }}>
                      {ch}
                    </motion.div>
                  )
                })}
              </motion.div>
            )
          })}
        </div>

        {over && !duel && (!result || !showRes) && (
          <div style={{ textAlign: 'center', margin: '6px 0' }}>
            {run.mode === 'daily' && <div className="row" style={{ justifyContent: 'center', gap: 8, fontSize: 12, fontWeight: 800 }}><span className="mute">NENO JIPYA</span><Flap text={fmtCountdown(clock)} /></div>}
            <div className="row" style={{ justifyContent: 'center', marginTop: 10 }}>
              {result && <button className="btn small gold" onClick={() => setShowRes(true)}><Icon name="trophy" size={16} /> Matokeo</button>}
              <button className="btn small" onClick={onNext}>Mazoezi <Icon name="next" size={16} /></button>
            </div>
          </div>
        )}
        {over && duel && <div style={{ textAlign: 'center', fontWeight: 900, margin: '6px 0' }}>Tunasubiri mpinzani…</div>}

        <div className="kb" style={{ opacity: busy ? .7 : 1 }}>
          {ROWS.map((row, ri) => (
            <div className="kb-row" key={ri}>
              {ri === 2 && <button className="key wide" onClick={() => type('enter')}>INGIZA</button>}
              {[...row].map(k => <button key={k} className={`key ${keyMarks[k] ?? ''}`} onClick={() => type(k)}>{k}</button>)}
              {ri === 2 && <button className="key wide" aria-label="Futa" onClick={() => type('del')}><Icon name="back" size={18} /></button>}
            </div>
          ))}
          {!duel && <SponsorStrip slot="daily" label={run.mode === 'daily' ? 'Neno la Siku limedhaminiwa na' : 'Imeletwa kwako na'} />}
        </div>
      </div>
      {duel && <DuelCountdown duel={duel} />}
      {!duel && <ResultSheet game="fumbua" result={result} open={showRes} onClose={() => setShowRes(false)} onAgain={onNext} onExit={() => (onLeave ? onLeave() : play(null))} />}
    </>
  )
}
