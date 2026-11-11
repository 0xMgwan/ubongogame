import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { GAMES, GameId, LEAGUES, leagueFor, levelFromXp, titleFor, useStore } from '../lib/store'
import { api } from '../lib/api'
import { Avatar, SponsorStrip, TopBar, spring } from '../components/ui'
import { GameMark, Icon } from '../components/icons'

type Period = 'day' | 'week' | 'all'
type Row = { id: number; name: string; avatar: string; region: string; score: number; pro: boolean; frame: string; lvl: number; me?: boolean }
type Board = { rows: Row[]; players: number; me: { score: number; rank: number | null } }

export default function Leaderboard() {
  const s = useStore()
  const [period, setPeriod] = useState<Period>('week')
  const [game, setGame] = useState<GameId | 'all'>('all')
  const [local, setLocal] = useState(false)
  const [board, setBoard] = useState<Board | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    setErr(null)
    const q = new URLSearchParams({ period, ...(game !== 'all' ? { game } : {}), ...(local ? { region: s.region } : {}) })
    api<Board>('/leaderboard?' + q).then(b => live && setBoard(b)).catch(e => live && setErr(e.message))
    return () => { live = false }
  }, [period, game, local, s.region])

  const league = leagueFor(s.weekly)
  const next = LEAGUES[LEAGUES.indexOf(league) + 1]
  const rows = board?.rows ?? []
  const top = rows.slice(0, 3)
  const myRank = board?.me.rank ?? null
  const meInList = rows.some(r => r.me)

  return (
    <>
      <TopBar />
      <div className="screen">
        <span className="kicker"><Icon name="trophy" size={13} /> Ligi ya wiki</span>
        <h1 className="display" style={{ fontSize: 56, marginTop: 10 }}>Ligi ya <span className="hl">Ubongo.</span></h1>
        <SponsorStrip slot="league" label="Ligi hii inadhaminiwa na" />

        <div className="card" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 14, background: league.color, color: '#141414' }}>
          <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 3 }}><Icon name="star" size={46} fill="#fffdf8" /></motion.div>
          <div className="grow">
            <div className="display" style={{ fontSize: 28 }}>{league.name}</div>
            <div style={{ fontSize: 12.5, fontWeight: 800 }}>{next ? `Alama ${(next.min - s.weekly).toLocaleString()} kupanda ${next.name}` : 'Uko kileleni!'}</div>
            {next && <div style={{ height: 10, borderRadius: 999, background: '#fffdf8', border: '2px solid #141414', marginTop: 8, overflow: 'hidden' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, ((s.weekly - league.min) / (next.min - league.min)) * 100)}%` }} transition={spring} style={{ height: '100%', background: '#141414' }} />
            </div>}
          </div>
        </div>

        <div className="seg" style={{ marginTop: 16 }}>
          {([['day', 'Leo'], ['week', 'Wiki hii'], ['all', 'Wakati wote']] as const).map(([k, l]) => (
            <button key={k} className={period === k ? 'on' : ''} onClick={() => setPeriod(k)}>
              {period === k && <motion.div layoutId="seg-lb" className="seg-bg" transition={spring} />}{l}
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 6, overflowX: 'auto', margin: '10px -16px 0', padding: '4px 16px 6px', scrollbarWidth: 'none' }}>
          <button className={`chip ${game === 'all' ? 'ink' : ''}`} onClick={() => setGame('all')}>Zote</button>
          {(Object.keys(GAMES) as GameId[]).map(g => (
            <button key={g} className="chip" style={game === g ? { background: GAMES[g].color, color: '#141414' } : undefined} onClick={() => setGame(g)}><GameMark game={g} size={16} /> {GAMES[g].name}</button>
          ))}
          <button className={`chip ${local ? 'ink' : ''}`} onClick={() => setLocal(v => !v)}><Icon name="pin" size={13} /> {s.region}</button>
        </div>

        {err && <div className="card" style={{ marginTop: 14, textAlign: 'center' }}>{err}</div>}
        {board && rows.length === 0 && (
          <div className="card" style={{ marginTop: 14, textAlign: 'center', padding: 26, borderStyle: 'dashed', boxShadow: 'none' }}>
            <Icon name="trophy" size={48} />
            <div className="display" style={{ fontSize: 28, marginTop: 6 }}>Ubao uko wazi!</div>
            <p style={{ fontWeight: 700, margin: '6px 0 0' }}>Maliza mchezo mmoja uwe wa kwanza kwenye ligi hii.</p>
          </div>
        )}
        <div className="podium">
          {[top[1], top[0], top[2]].map((r, i) => !r ? <div key={'e' + i} /> : (
            <motion.div key={r.id + ':' + period + game} className="pod" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...spring, delay: [0.1, 0, 0.2][i] }}>
              {i === 1 && <motion.div animate={{ rotate: [-6, 6, -6] }} transition={{ repeat: Infinity, duration: 2 }}><Icon name="crown" size={30} fill="var(--gold)" /></motion.div>}
              <Avatar size={i === 1 ? 66 : 54} avatar={r.avatar} frame={r.frame} />
              <div style={{ fontWeight: 900, fontSize: 13, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.me ? 'Wewe' : r.name}</div>
              <div className="mute" style={{ fontSize: 12, fontWeight: 900 }}>{r.score.toLocaleString()}</div>
              <div className="stand" style={{ height: [76, 104, 60][i], background: ['#dfe6f2', 'var(--gold)', '#e8a06a'][i] }}>{[2, 1, 3][i]}</div>
            </motion.div>
          ))}
        </div>

        {rows.length > 3 && <div className="card" style={{ padding: 6 }}>{rows.slice(3).map((r, i) => <LbRow key={r.id} r={r} rank={i + 4} />)}</div>}
        {myRank && !meInList && (
          <div style={{ position: 'sticky', bottom: 0, marginTop: 8 }}>
            <LbRow r={{ id: s.id, name: s.name, avatar: s.avatar, region: s.region, score: board!.me.score, pro: s.pro, frame: s.frame, lvl: levelFromXp(s.xp), me: true }} rank={myRank} />
          </div>
        )}
        {board && board.players > 0 && <p className="mute" style={{ fontSize: 12, textAlign: 'center', marginTop: 12, fontWeight: 700 }}>Wachezaji {board.players.toLocaleString()} kwenye ubao huu · Washindi 3 wa wiki hupata almasi 50</p>}
      </div>
    </>
  )
}

function LbRow({ r, rank }: { r: Row; rank: number }) {
  return (
    <motion.div className={`lb-row ${r.me ? 'me' : ''}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(rank, 15) * 0.015 }}>
      <div className="lb-rank">{rank}</div>
      <Avatar size={38} avatar={r.avatar} frame={r.frame} />
      <div className="grow">
        <div className="row" style={{ gap: 6 }}>
          <span style={{ fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.me ? `${r.name} (wewe)` : r.name}</span>
          {r.pro && <span className="pro-badge">KIFALME</span>}
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 700, opacity: .7 }}>{titleFor(r.lvl)} · {r.region}</div>
      </div>
      <div className="display" style={{ fontSize: 22 }}>{r.score.toLocaleString()}</div>
    </motion.div>
  )
}
