// Live duel HUD: opponent bar, synced countdown, time bar. Data comes from Vita's polling.
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Avatar } from './ui'
import { Icon } from './icons'
import { sfx } from '../lib/sound'

export type Mark = 'correct' | 'present' | 'absent'
export type DuelSide = { score: number; words?: number; rows?: Mark[][]; solved?: boolean; guesses?: number; done: boolean }
export type DuelState = {
  id: string; game: 'windo' | 'fumbua'; kind: 'queue' | 'room' | 'ghost'; status: string; roomCode: string | null
  now: number; startsAt: number | null; endsAt: number | null; waitedMs: number
  me: (DuelSide & { runId: string }) | null
  opp: (DuelSide & { player: { id: number; name: string; avatar: string; frame: string; pro: boolean; duelWins: number }; ghost: boolean; answer?: string }) | null
  outcome: 'win' | 'lose' | 'draw' | null; reward: number
  skew?: number // server now − client now, set by Vita
}

/** Server time, corrected for the client's clock. */
export const serverNow = (d: DuelState) => Date.now() + (d.skew ?? 0)

export function useTicker(ms = 250) {
  const [, set] = useState(0)
  useEffect(() => { const iv = setInterval(() => set(x => x + 1), ms); return () => clearInterval(iv) }, [ms])
}

export function OppBar({ duel, myScore }: { duel: DuelState; myScore?: number }) {
  const o = duel.opp
  if (!o) return null
  const ahead = myScore !== undefined && duel.game === 'windo' ? Math.sign(myScore - o.score) : 0
  return (
    <motion.div className="opp-bar" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
      <Avatar size={38} avatar={o.player.avatar} frame={o.player.frame} />
      <div className="grow">
        <div className="row" style={{ gap: 6 }}>
          <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.player.name}</b>
          {o.ghost && <span className="chip" style={{ fontSize: 10, padding: '1px 7px' }}><Icon name="ghost" size={12} /> Rekodi</span>}
        </div>
        <div className="mute" style={{ fontSize: 11.5, fontWeight: 800 }}>
          {duel.game === 'windo' ? `Maneno ${o.words ?? 0}` : o.solved ? 'Ameshafumbua!' : `Majaribio ${o.guesses ?? 0}/6`}
        </div>
      </div>
      {duel.game === 'fumbua' ? (
        <div className="mini-rows">
          {Array.from({ length: 6 }, (_, r) => <div key={r}>{Array.from({ length: 5 }, (_, i) => <i key={i} className={o.rows?.[r]?.[i] ?? ''} />)}</div>)}
        </div>
      ) : (
        <motion.div key={o.score} className="score" initial={{ scale: 1.4, color: '#e5452b' }} animate={{ scale: 1, color: ahead < 0 ? '#e5452b' : 'var(--ink)' }}>{o.score.toLocaleString()}</motion.div>
      )}
    </motion.div>
  )
}

export function DuelCountdown({ duel }: { duel: DuelState }) {
  useTicker(100)
  const left = (duel.startsAt ?? 0) - serverNow(duel)
  const n = Math.ceil(left / 1000)
  useEffect(() => { if (n > 0 && n <= 3) sfx.key(); if (n === 0) sfx.great() }, [n])
  return (
    <AnimatePresence>
      {left > -600 && (
        <motion.div className="countdown" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <AnimatePresence mode="popLayout">
            <motion.b key={n} initial={{ scale: 2.2, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: -4, opacity: 1 }} exit={{ scale: .5, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 16 }}>
              {n > 0 ? n : 'TWENDE!'}
            </motion.b>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function DuelTimeBar({ duel }: { duel: DuelState }) {
  useTicker(250)
  if (!duel.startsAt || !duel.endsAt) return null
  const total = duel.endsAt - duel.startsAt
  const left = Math.max(0, duel.endsAt - Math.max(serverNow(duel), duel.startsAt))
  return (
    <div style={{ height: 12, border: 'var(--line)', borderRadius: 999, overflow: 'hidden', background: 'var(--paper)', marginBottom: 10 }}>
      <div style={{ height: '100%', width: `${(left / total) * 100}%`, background: left < 15000 ? 'var(--red)' : 'repeating-linear-gradient(-45deg, var(--gold) 0 10px, var(--gold-2) 10px 20px)', transition: 'width .25s linear' }} />
    </div>
  )
}
