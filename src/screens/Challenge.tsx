// /c/:code — a friend's challenge. Admit-one ticket + standings; accepting plays the exact same puzzle.
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { GAMES, GameId, useStore } from '../lib/store'
import { useNav } from '../lib/nav'
import { api } from '../lib/api'
import type { RunView, ServerResult } from '../lib/runs'
import { sfx } from '../lib/sound'
import { Avatar, spring } from '../components/ui'
import { GameMark, Icon } from '../components/icons'

type Row = { id: number; name: string; avatar: string; frame: string; pro: boolean; score: number; creator: boolean }
type Ch = { code: string; game: GameId; level: number | null; creatorScore: number; creator: { id: number; name: string; avatar: string; frame: string }; plays: number; rows: Row[] }

export default function Challenge({ code }: { code: string }) {
  const s = useStore()
  const { openChallenge, play } = useNav()
  const [c, setC] = useState<Ch | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { api<Ch>(`/challenges/${code}`).then(setC).catch(e => setErr(e.message)) }, [code])
  const close = () => { openChallenge(null); history.replaceState(null, '', '/') }
  const accept = async () => {
    setBusy(true)
    try {
      const r = await api<{ run: RunView; result: ServerResult | null }>(`/challenges/${code}/play`, { body: {} })
      if (r.result) { s.notify('Umeshacheza changamoto hii', 'ticket'); setBusy(false); return }
      sfx.whoosh(); close(); play(c!.game, r.run)
    } catch (e) { s.fail(e); setBusy(false) }
  }
  const mine = c && c.creator.id === s.id
  const played = c?.rows.find(r => r.id === s.id && !r.creator)
  const shareAgain = () => {
    const text = `Changamoto yangu ya ${GAMES[c!.game].name}: alama ${c!.creatorScore.toLocaleString()}. Unaweza kunishinda? ${location.origin}/c/${code}`
    if (navigator.share) navigator.share({ text }).catch(() => {}); else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  return (
    <motion.div className="screen" style={{ position: 'absolute', inset: 0, zIndex: 25, background: 'var(--bg)', paddingTop: 'calc(env(safe-area-inset-top) + 14px)', paddingBottom: 40 }}
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={spring}>
      <div className="row" style={{ marginBottom: 14 }}>
        <button className="icon-btn" onClick={close} aria-label="Funga"><Icon name="close" size={20} /></button>
        <span className="kicker"><Icon name="ticket" size={13} /> Changamoto</span>
      </div>
      {err && <div className="card" style={{ textAlign: 'center' }}><Icon name="ban" size={44} /><p style={{ fontWeight: 800 }}>{err}</p></div>}
      {!c && !err && <div className="card" style={{ height: 220, opacity: .5 }} />}
      {c && (
        <>
          <motion.div className="ticket" initial={{ rotate: -6, y: 20, opacity: 0 }} animate={{ rotate: -1.5, y: 0, opacity: 1 }} transition={spring} style={{ background: GAMES[c.game].color }}>
            <div className="t-side">ADMIT ONE · UBONGO</div>
            <div className="t-body">
              <div className="row">
                <Avatar size={52} avatar={c.creator.avatar} frame={c.creator.frame} />
                <div className="grow">
                  <small style={{ fontWeight: 900, letterSpacing: '.12em', fontSize: 10.5 }}>{mine ? 'CHANGAMOTO YAKO' : 'UMEITWA NA'}</small>
                  <div className="display" style={{ fontSize: 30 }}>{c.creator.name}</div>
                </div>
                <div style={{ background: '#fffdf8', border: '2.5px solid #141414', borderRadius: 14, padding: 4, transform: 'rotate(6deg)' }}><GameMark game={c.game} size={44} /></div>
              </div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{GAMES[c.game].name}{c.level ? ` · ngazi ${c.level}` : ''} — ubao ule ule, nafasi moja tu.</div>
              <div className="row" style={{ alignItems: 'flex-end' }}>
                <div className="grow">
                  <small style={{ fontWeight: 900, letterSpacing: '.12em', fontSize: 10.5 }}>ALAMA YA KUSHINDA</small>
                  <div className="display" style={{ fontSize: 64, lineHeight: .85 }}>{c.creatorScore.toLocaleString()}</div>
                </div>
                <span className="chip ink">{c.plays} wamecheza</span>
              </div>
              <div className="barcode" />
            </div>
            <div className="t-no">№ {c.code.toUpperCase()}</div>
          </motion.div>

          <div style={{ marginTop: 22 }}>
            {mine ? (
              <button className="btn green block" onClick={shareAgain}><Icon name="whatsapp" size={22} /> Tuma tena kwa marafiki</button>
            ) : played ? (
              <div className="card" style={{ textAlign: 'center', background: played.score > c.creatorScore ? 'var(--green)' : 'var(--paper)', color: played.score > c.creatorScore ? '#fff' : undefined }}>
                <b>{played.score > c.creatorScore ? 'Umemshinda!' : 'Umeshacheza'} · alama {played.score.toLocaleString()}</b>
              </div>
            ) : s.status !== 'ready' ? (
              <p style={{ fontWeight: 800, textAlign: 'center' }}>Jiunge kwanza (sekunde 10) — utarudishwa hapa.</p>
            ) : (
              <button className="btn red block nudge" style={{ height: 60, fontSize: 18 }} disabled={busy} onClick={accept}>
                <Icon name="bolt" size={22} fill="var(--gold)" /> {busy ? 'Inaandaa…' : 'Kubali changamoto'}
              </button>
            )}
          </div>

          <div className="h-sec"><h2>Ubao wa changamoto</h2></div>
          <div className="card" style={{ padding: 6 }}>
            {c.rows.map((r, i) => (
              <div key={r.id + ':' + i} className={`lb-row ${r.id === s.id ? 'me' : ''}`}>
                <div className="lb-rank">{i + 1}</div>
                <Avatar size={36} avatar={r.avatar} frame={r.frame} />
                <div className="grow"><b>{r.name}</b>{r.creator && <span className="chip" style={{ marginLeft: 6, fontSize: 10 }}>mwanzilishi</span>}</div>
                <div className="display" style={{ fontSize: 22 }}>{r.score.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  )
}
