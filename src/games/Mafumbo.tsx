import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { makeCrossword, Placed } from '../lib/crossword'
import { rngFor } from '../lib/rng'
import { useStore } from '../lib/store'
import { useNav } from '../lib/nav'
import { RunView, finishRun, startRun, useRunItem } from '../lib/runs'
import { sfx } from '../lib/sound'
import { GameHead, GameLoading, PowerBtn, Result, ResultSheet, SponsorStrip, baseResult } from '../components/ui'
import { Icon } from '../components/icons'

const ROWS = ['ertyuiop', 'asdfghjkl', 'zcvbnm']
const K = (r: number, c: number) => `${r},${c}`

function cellsOf(w: Placed) {
  return [...w.word].map((_, i) => (w.dir === 'A' ? K(w.r, w.c + i) : K(w.r + i, w.c)))
}

export default function Mafumbo({ run: given, onLeave }: { run?: RunView | null; onLeave?: () => void }) {
  const s = useStore()
  const [run, setRun] = useState<RunView | null>(given ?? null)
  const [err, setErr] = useState<string | null>(null)
  const load = async (daily: boolean) => {
    setErr(null); setRun(null)
    try {
      let r = await startRun('mafumbo', daily ? 'daily' : undefined)
      if (r.result) { s.notify('Umeshamaliza fumbo la leo — hili ni la mazoezi', 'calendar'); r = await startRun('mafumbo') }
      setRun(r.run)
    } catch (e: any) { setErr(e.message) }
  }
  useEffect(() => { if (!given) load(true) }, [])
  if (!run) return <><GameHead game="mafumbo" onBack={onLeave} /><GameLoading error={err} retry={() => load(true)} /></>
  return <Board key={run.id} run={run} onNext={() => load(false)} onLeave={onLeave} />
}

function Board({ run, onNext, onLeave }: { run: RunView; onNext: () => void; onLeave?: () => void }) {
  const s = useStore()
  const play = useNav(n => n.play)
  const cw = useMemo(() => makeCrossword(rngFor(run.seed!), 9), [run.seed])
  const [finishing, setFinishing] = useState(false)
  const [entries, setEntries] = useState<Record<string, string>>({})
  const [locked, setLocked] = useState<Set<string>>(new Set())
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [wrong, setWrong] = useState<Set<string>>(new Set())
  const [active, setActive] = useState(0)
  const [cursor, setCursor] = useState<string>(() => cellsOf(cw.words[0])[0])
  const [solvedWords, setSolvedWords] = useState<Set<number>>(new Set())
  const t0 = run.startedAt
  const [now, setNow] = useState(Date.now())
  const [helps, setHelps] = useState(run.helps)
  const [result, setResult] = useState<Result | null>(null)
  const [showList, setShowList] = useState(false)

  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv) }, [])

  const solution = useMemo(() => {
    const m: Record<string, string> = {}
    cw.words.forEach(w => cellsOf(w).forEach((k, i) => (m[k] = w.word[i])))
    return m
  }, [cw])
  const word = cw.words[active]
  const wordCells = useMemo(() => cellsOf(word), [word])

  const checkSolved = (ent: Record<string, string>) => {
    const newly: number[] = []
    cw.words.forEach((w, i) => {
      if (solvedWords.has(i)) return
      if (cellsOf(w).every((k, j) => ent[k] === w.word[j])) newly.push(i)
    })
    if (!newly.length) return
    const sw = new Set(solvedWords); newly.forEach(i => sw.add(i)); setSolvedWords(sw)
    const lk = new Set(locked); newly.forEach(i => cellsOf(cw.words[i]).forEach(k => lk.add(k))); setLocked(lk)
    if (sw.size === cw.words.length) {
      sfx.win()
      submitSolved(ent)
    } else {
      sfx.good(); s.notify(`"${cw.words[newly[0]].word.toUpperCase()}" sahihi!`, 'check')
      // jump to next unsolved
      const nx = cw.words.findIndex((_, i) => !sw.has(i) && i > active)
      const pickI = nx >= 0 ? nx : cw.words.findIndex((_, i) => !sw.has(i))
      if (pickI >= 0) goWord(pickI, sw)
    }
  }

  const submitSolved = async (ent: Record<string, string>) => {
    if (finishing) return
    setFinishing(true)
    try {
      const r = await finishRun(run.id, { entries: ent })
      const secs = r.secs ?? Math.round((Date.now() - t0) / 1000)
      const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
      setTimeout(() => setResult({
        ...baseResult(r, run), stamp: 'Imekamilika',
        title: 'Umechemsha Bongo!', sub: `Maneno ${cw.words.length} yamekamilika${run.mode === 'daily' ? ' · Fumbo la Leo' : ''}`,
        share: `Ubongo · Mafumbo ✅ dakika ${mmss} · alama ${r.score} 🧩 ${location.origin}`,
        stats: [['Muda', mmss], ['Misaada', String(helps)]],
      }), 500)
    } catch (e) { s.fail(e); setFinishing(false) }
  }

  const goWord = (i: number, sw = solvedWords) => {
    setActive(i)
    const cells = cellsOf(cw.words[i])
    setCursor(cells.find(k => !entries[k]) ?? cells[0])
    void sw
  }

  const tapCell = (k: string) => {
    sfx.tap()
    const containing = cw.words.map((w, i) => [w, i] as const).filter(([w]) => cellsOf(w).includes(k))
    if (!containing.length) return
    if (k === cursor && containing.length > 1) {
      const other = containing.find(([, i]) => i !== active)
      if (other) setActive(other[1])
    } else if (!containing.some(([, i]) => i === active)) setActive(containing[0][1])
    setCursor(k)
  }

  const type = (ch: string) => {
    if (result) return
    if (ch === 'del') {
      const idx = wordCells.indexOf(cursor)
      if (entries[cursor] && !locked.has(cursor)) { const e = { ...entries }; delete e[cursor]; setEntries(e) }
      else if (idx > 0) {
        const prev = wordCells[idx - 1]; setCursor(prev)
        if (!locked.has(prev)) { const e = { ...entries }; delete e[prev]; setEntries(e) }
      }
      sfx.key(); return
    }
    if (locked.has(cursor)) { advance(); return }
    const e = { ...entries, [cursor]: ch }
    setEntries(e); sfx.key()
    if (wrong.has(cursor)) { const w = new Set(wrong); w.delete(cursor); setWrong(w) }
    advance(e)
    checkSolved(e)
  }
  const advance = (e = entries) => {
    const idx = wordCells.indexOf(cursor)
    const next = wordCells.slice(idx + 1).find(k => !locked.has(k)) ?? wordCells.slice(idx + 1)[0]
    if (next) setCursor(next)
    void e
  }

  useEffect(() => {
    const h = (ev: KeyboardEvent) => {
      if (ev.key === 'Backspace') type('del')
      else if (/^[a-z]$/i.test(ev.key)) type(ev.key.toLowerCase())
      else if (ev.key === 'Tab' || ev.key === 'Enter') { ev.preventDefault(); goWord((active + 1) % cw.words.length) }
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  })

  const revealLetter = async () => {
    const target = locked.has(cursor) || entries[cursor] === solution[cursor] ? wordCells.find(k => entries[k] !== solution[k]) : cursor
    if (!target || result) return
    if (!(await useRunItem(run.id, 'dokezo'))) return
    const e = { ...entries, [target]: solution[target] }
    setEntries(e); setRevealed(new Set(revealed).add(target)); setLocked(new Set(locked).add(target)); setHelps(h => h + 1); sfx.pop()
    checkSolved(e)
  }
  const revealWord = async () => {
    if (solvedWords.has(active) || result) return
    if (!(await useRunItem(run.id, 'bomu'))) return
    const e = { ...entries }; const rv = new Set(revealed)
    wordCells.forEach(k => { if (e[k] !== solution[k]) rv.add(k); e[k] = solution[k] })
    setEntries(e); setRevealed(rv); setHelps(h => h + 2); sfx.whoosh()
    checkSolved(e)
  }
  const check = () => {
    const w = new Set<string>()
    Object.entries(entries).forEach(([k, v]) => { if (v !== solution[k]) w.add(k) })
    setWrong(w); sfx[w.size ? 'bad' : 'good']()
    s.notify(w.size ? `Herufi ${w.size} si sahihi` : 'Zote sahihi hadi sasa!', w.size ? 'search' : 'check')
  }

  const secs = Math.round((now - t0) / 1000)
  const avail = Math.min(window.innerWidth, 440) - 36
  const size = Math.min(38, Math.floor((avail + cw.cols) / cw.cols))

  return (
    <>
      <GameHead game="mafumbo" onBack={onLeave} sub={`${solvedWords.size}/${cw.words.length} maneno · ⏱ ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`}
        right={<div className="row" style={{ gap: 6 }}>
          <PowerBtn icon="check" onClick={check} label="Kagua" />
          <PowerBtn icon="bulb" count={s.inv.dokezo} onClick={revealLetter} label="Fichua herufi" />
          <PowerBtn icon="bomb" count={s.inv.bomu} onClick={revealWord} label="Fichua neno" />
        </div>} />
      <div className="g-body" style={{ overflowY: 'auto' }}>
        <div className="cw-wrap">
          <div className="cw-grid" style={{ gridTemplateColumns: `repeat(${cw.cols}, ${size}px)` }}>
            {cw.cells.map((row, r) => row.map((ch, c) => {
              const k = K(r, c)
              if (!ch) return <div key={k} className="cw-cell block" />
              const cls = ['cw-cell',
                locked.has(k) && !revealed.has(k) ? 'solved' : '',
                revealed.has(k) ? 'solved revealed' : '',
                wordCells.includes(k) ? 'inword' : '',
                k === cursor ? 'cursor' : '',
                wrong.has(k) ? 'wrong' : ''].join(' ')
              return (
                <motion.button key={k} className={cls} style={{ fontSize: size * 0.5 }} onClick={() => tapCell(k)}
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: (r + c) * 0.015, type: 'spring', stiffness: 500, damping: 25 }}>
                  {cw.numbers[k] && <span className="n">{cw.numbers[k]}</span>}
                  {entries[k] ?? ''}
                </motion.button>
              )
            }))}
          </div>
        </div>

        <motion.button key={active} className="clue-bar" initial={{ y: 8, opacity: .4 }} animate={{ y: 0, opacity: 1 }} onClick={() => setShowList(v => !v)} style={{ textAlign: 'left', width: '100%' }}>
          <span onClick={e => { e.stopPropagation(); goWord((active - 1 + cw.words.length) % cw.words.length) }} style={{ padding: '0 2px' }}><Icon name="back" size={20} /></span>
          <span className="cb-num">{word.num}{word.dir === 'A' ? ' →' : ' ↓'}</span>
          <span className="cb-text grow">{word.clue}</span>
          <span onClick={e => { e.stopPropagation(); goWord((active + 1) % cw.words.length) }} style={{ padding: '0 2px' }}><Icon name="next" size={20} /></span>
        </motion.button>

        {showList ? (
          <div className="card" style={{ marginTop: 10, padding: 10 }}>
            {(['A', 'D'] as const).map(d => (
              <div key={d} style={{ marginBottom: 6 }}>
                <div className="kicker" style={{ margin: '4px 6px' }}>{d === 'A' ? 'Mlalo →' : 'Wima ↓'}</div>
                <div className="clue-list">
                  {cw.words.map((w, i) => w.dir === d && (
                    <button key={i} className={`${i === active ? 'on' : ''} ${solvedWords.has(i) ? 'done' : ''}`} onClick={() => { goWord(i); setShowList(false) }}>
                      <b>{w.num}</b> {w.clue} <span className="dim">({w.word.length})</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="kb" style={{ marginTop: 12 }}>
          {ROWS.map((row, ri) => (
            <div className="kb-row" key={ri}>
              {[...row].map(k => <button key={k} className="key" onClick={() => type(k)}>{k}</button>)}
              {ri === 2 && <button className="key wide" aria-label="Futa" onClick={() => type('del')}><Icon name="back" size={18} /></button>}
            </div>
          ))}
          <SponsorStrip slot="cw" />
        </div>
      </div>
      <ResultSheet game="mafumbo" result={result}
        onAgain={onNext} onExit={() => (onLeave ? onLeave() : play(null))} />
    </>
  )
}
