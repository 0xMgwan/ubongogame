import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { rngFor, shuffle } from '../lib/rng'
import { panguaTargets } from '../lib/boards'
import { useStore } from '../lib/store'
import { useNav } from '../lib/nav'
import { RunView, finishRun, startRun, useRunItem } from '../lib/runs'
import { sfx } from '../lib/sound'
import { useTrace } from '../lib/useTrace'
import { GameHead, GameLoading, PowerBtn, Result, ResultSheet, SponsorStrip, baseResult, spring } from '../components/ui'
import { Icon } from '../components/icons'

const W = 280

export default function Pangua({ run: given, onLeave }: { run?: RunView | null; onLeave?: () => void }) {
  const [run, setRun] = useState<RunView | null>(given ?? null)
  const [err, setErr] = useState<string | null>(null)
  const load = async () => {
    setErr(null); setRun(null)
    try { setRun((await startRun('pangua')).run) } catch (e: any) { setErr(e.message) }
  }
  useEffect(() => { if (!given) load() }, [])
  if (!run) return <><GameHead game="pangua" onBack={onLeave} /><GameLoading error={err} retry={load} /></>
  return <Board key={run.id} run={run} onNext={load} onLeave={onLeave} />
}

function Board({ run, onNext, onLeave }: { run: RunView; onNext: () => void; onLeave?: () => void }) {
  const s = useStore()
  const play = useNav(n => n.play)
  const level = run.level ?? 1
  const base = run.seed!
  const targets = useMemo(() => panguaTargets(base), [base])
  const [perm, setPerm] = useState<number[]>([])
  const order = perm.map(j => base[j] ?? '')
  const [found, setFound] = useState<string[]>([])
  const [hinted, setHinted] = useState<Record<string, number>>({})
  const [msg, setMsg] = useState<{ id: number; t: string; ok: boolean } | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [helps, setHelps] = useState(0)

  useEffect(() => { setPerm(shuffle([...base].map((_, i) => i), rngFor(base))); setFound([]); setHinted({}); setResult(null); setHelps(0) }, [base])

  const n = order.length
  const rad = n <= 5 ? 92 : n === 6 ? 98 : 104
  const centers = () => order.map((_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2
    return { x: W / 2 + Math.cos(a) * rad, y: W / 2 + Math.sin(a) * rad }
  })
  const submit = (p: number[]) => {
    const w = p.map(i => order[i]).join('')
    if (w.length < 3) return
    if (found.includes(w)) { sfx.bad(); setMsg({ id: Date.now(), t: 'Tayari umepata', ok: false }); return }
    if (targets.includes(w)) {
      const f = [...found, w]; setFound(f)
      w === base ? sfx.great() : sfx.good()
      setMsg({ id: Date.now(), t: w === base ? `${w} · neno kuu!` : `${w} sahihi`, ok: true })
      if (f.length === targets.length) {
        finishRun(run.id, { words: f }).then(r => setTimeout(() => setResult({
          ...baseResult(r, run), stamp: `Ngazi ${level}`,
          title: run.mode === 'challenge' ? 'Changamoto imekamilika!' : `Ngazi ${level} imekamilika!`, sub: `Neno kuu lilikuwa "${base.toUpperCase()}"`,
          share: `Ubongo · Pangua 🌀 Ngazi ${level} — maneno ${targets.length} kutoka "${base.length}" herufi!`,
          stats: [['Maneno', String(targets.length)], ['Misaada', String(helps)]],
        }), 600)).catch(e => s.fail(e))
      }
    } else { sfx.bad(); setMsg({ id: Date.now(), t: 'Si neno', ok: false }) }
  }
  const { ref, path, pointsFor } = useTrace({ item: '.wheel-l', radius: 0.55, canAdd: () => true, onAdd: p => sfx.chain(p.length), onEnd: submit })
  const cur = path.map(i => order[i]).join('')

  const reshuffle = () => { sfx.whoosh(); setPerm(o => { let x = shuffle(o); if (x.join() === o.join()) x = shuffle(o); return x }) }
  const hint = async () => {
    const open = targets.filter(t => !found.includes(t) && (hinted[t] ?? 0) < t.length - 1)
    if (!open.length) return
    if (!(await useRunItem(run.id, 'dokezo'))) return
    const t = open.sort((a, b) => a.length - b.length)[0]
    setHinted(h => ({ ...h, [t]: (h[t] ?? 0) + 1 })); setHelps(x => x + 1); sfx.pop()
  }
  const reveal = async () => {
    const open = targets.filter(t => !found.includes(t))
    if (!open.length) return
    if (!(await useRunItem(run.id, 'bomu'))) return
    setHelps(x => x + 2)
    submit([...open[0]].reduce<number[]>((acc, ch) => { const i = order.findIndex((c, j) => c === ch && !acc.includes(j)); return [...acc, i] }, []))
  }

  const pts = pointsFor(path)

  return (
    <>
      <GameHead game="pangua" onBack={onLeave} sub={`${run.mode === 'challenge' ? 'Changamoto' : `Ngazi ${level}`} · ${found.length}/${targets.length} maneno`}
        right={<div className="row" style={{ gap: 6 }}>
          <PowerBtn icon="bulb" count={s.inv.dokezo} onClick={hint} label="Dokezo" />
          <PowerBtn icon="bomb" count={s.inv.bomu} onClick={reveal} label="Fichua neno" />
        </div>} />
      <div className="g-body">
        <div className="pg-slots" style={{ flex: 1, overflowY: 'auto' }}>
          {targets.map(t => {
            const f = found.includes(t), h = hinted[t] ?? 0
            return (
              <motion.div key={t} layout className={`pg-word ${f ? 'found' : ''} ${h ? 'hinted' : ''}`}>
                {[...t].map((ch, i) => (
                  <motion.div key={i} className={`pg-box ${i < h ? 'h' : ''}`}
                    animate={f ? { rotateY: [90, 0], scale: [1.2, 1] } : {}} transition={{ delay: i * 0.05 }}>
                    {f || i < h ? ch : ''}
                  </motion.div>
                ))}
              </motion.div>
            )
          })}
        </div>

        <div style={{ height: 56, display: 'grid', placeItems: 'center' }}>
          <AnimatePresence mode="popLayout">
            {cur ? (
              <motion.div key="c" className="word-preview" initial={{ scale: .8 }} animate={{ scale: 1 }}>
                <div className="wp" style={{ background: 'var(--red)', color: '#fff' }}>{cur}</div>
              </motion.div>
            ) : msg ? (
              <motion.div key={msg.id} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
                className={`chip ${msg.ok ? 'green' : ''}`} style={{ fontSize: 15, padding: '8px 16px', textTransform: 'uppercase', rotate: '-3deg' }}>{msg.t}</motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="wheel" ref={ref}>
          <svg width={W} height={W} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {pts.length > 1 && <polyline points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#141414" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
          {perm.map((j, i) => ({ j, i })).sort((a, b) => a.j - b.j).map(({ j, i }) => {
            const c = centers()[i]
            return (
              <motion.div key={base + j} data-i={i} className={`wheel-l ${path.includes(i) ? 'sel' : ''}`} initial={{ left: W / 2, top: W / 2, scale: 0 }}
                animate={{ left: c.x, top: c.y, scale: path.includes(i) ? .92 : 1 }} transition={spring}>{base[j]}</motion.div>
            )
          })}
          <motion.button className="wheel-c" whileTap={{ rotate: 180, scale: .9 }} onClick={reshuffle}><Icon name="shuffle" size={26} /></motion.button>
        </div>
        <SponsorStrip slot="pangua" />
      </div>
      <ResultSheet game="pangua" result={result}
        onAgain={run.mode === 'challenge' ? undefined : onNext} onExit={() => (onLeave ? onLeave() : play(null))} />
    </>
  )
}
