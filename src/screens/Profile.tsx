import { motion } from 'framer-motion'
import { useState } from 'react'
import { AVATARS, GAMES, GameId, Me, REGIONS, THEMES, ThemeId, levelFromXp, titleFor, useStore, xpForLevel } from '../lib/store'
import { useNav } from '../lib/nav'
import { api } from '../lib/api'
import { setHaptics, setSound, sfx } from '../lib/sound'
import { Avatar, PasswordField, Sheet, TopBar, spring } from '../components/ui'
import { InstallGuide, isStandalone } from '../components/install'
import { ANIMAL_NAMES, AnimalArt, GameMark, Icon, IconName } from '../components/icons'

export default function Profile() {
  const s = useStore()
  const openAd = useNav(n => n.openAdvertise)
  const [pickAvatar, setPickAvatar] = useState(false)
  const [name, setName] = useState(s.name)
  const [restore, setRestore] = useState(false)
  const [code, setCode] = useState('')
  const [pwOpen, setPwOpen] = useState(false)
  const [cur, setCur] = useState('')
  const [npw, setNpw] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [install, setInstall] = useState(false)
  const savePassword = async () => {
    setPwBusy(true)
    try {
      const r = await api<{ me: Me }>('/me/password', { body: { current: cur, password: npw } })
      s.applyMe(r.me); setCur(''); setNpw(''); setPwOpen(false); sfx.good(); s.notify('Nenosiri limebadilishwa', 'lock')
    } catch (e) { sfx.bad(); s.fail(e) } finally { setPwBusy(false) }
  }
  const lvl = levelFromXp(s.xp)
  const lo = xpForLevel(lvl), hi = xpForLevel(lvl + 1)
  const totalWins = Object.values(s.stats).reduce((a, x) => a + x.won, 0)
  const medals: { icon: IconName; name: string; got: boolean; color: string }[] = [
    { icon: 'star', name: 'Mwanzo Mpya', got: totalWins >= 1, color: '#7ed6a8' },
    { icon: 'fire', name: 'Moto wa Siku 3', got: s.bestStreak >= 3, color: '#ff8f7a' },
    { icon: 'bolt', name: 'Wiki ya Moto', got: s.bestStreak >= 7, color: '#f5b800' },
    { icon: 'swords', name: 'Mshindi wa Vita', got: s.duelWins >= 1, color: '#e5452b' },
    { icon: 'trophy', name: 'Gwiji wa Fumbua', got: s.fumbuaDist[0] + s.fumbuaDist[1] > 0, color: '#12805c' },
    { icon: 'key', name: 'Mwalimu', got: lvl >= 10, color: '#8ec1ff' },
    { icon: 'crown', name: 'Kifalme', got: s.pro, color: '#f5b800' },
    { icon: 'chest', name: 'Bingwa wa Mafumbo', got: s.stats.mafumbo.won >= 5, color: '#ff9fb6' },
  ]
  const maxDist = Math.max(1, ...s.fumbuaDist)
  const saveName = async () => { const n = name.trim(); if (n.length >= 3 && n !== s.name) await s.updateMe({ name: n }); setName(useStore.getState().name) }
  const doRestore = async () => {
    try {
      const r = await api<{ token: string; me: Me }>('/auth/restore', { body: { code } })
      s.signIn(r.token, r.me); setName(r.me.name); setRestore(false); s.notify(`Karibu tena, ${r.me.name}!`, 'key')
    } catch (e) { s.fail(e) }
  }
  const ownedThemes = (Object.keys(THEMES) as ThemeId[]).filter(t => s.ownedThemes.includes(t) && (!THEMES[t].pro || s.pro))

  return (
    <>
      <TopBar />
      <div className="screen">
        <div style={{ textAlign: 'center', marginTop: 6 }}>
          <motion.button whileTap={{ scale: .94, rotate: -4 }} onClick={() => setPickAvatar(true)} style={{ display: 'inline-block', position: 'relative' }}>
            <Avatar size={112} />
            <span className="chip gold" style={{ position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%) rotate(-3deg)', fontSize: 11 }}>Badili</span>
          </motion.button>
          <input className="field display" value={name} maxLength={16} onChange={e => setName(e.target.value)} onBlur={saveName} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            style={{ textAlign: 'center', fontSize: 40, background: 'transparent', border: 0, boxShadow: 'none', marginTop: 14, height: 48 }} />
          <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
            <span className="chip ink"><Icon name="star" size={13} fill="var(--gold)" /> {titleFor(lvl)}</span>
            {s.pro && <span className="chip gold"><Icon name="crown" size={13} /> Kifalme</span>}
            <span className="chip"><Icon name="pin" size={13} /> {s.region}</span>
          </div>
        </div>

        <div className="card" style={{ marginTop: 18 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="display" style={{ fontSize: 28 }}>Ngazi {lvl}</span>
            <span className="mute" style={{ fontWeight: 800, fontSize: 13 }}>{s.xp - lo} / {hi - lo} XP</span>
          </div>
          <div style={{ height: 14, borderRadius: 999, background: 'var(--soft)', border: 'var(--line)', marginTop: 10, overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${((s.xp - lo) / (hi - lo)) * 100}%` }} transition={spring} style={{ height: '100%', background: 'repeating-linear-gradient(-45deg, var(--gold) 0 10px, var(--gold-2) 10px 20px)' }} />
          </div>
          <div className="row" style={{ marginTop: 14, justifyContent: 'space-around', textAlign: 'center' }}>
            <Stat v={`${s.streak}`} l="Mfululizo" /><Stat v={`${s.bestStreak}`} l="Bora" /><Stat v={`${totalWins}`} l="Ushindi" /><Stat v={`${s.duelWins}`} l="Vita" />
          </div>
        </div>

        <div className="h-sec"><h2>Takwimu</h2></div>
        <div className="grid2">
          {(Object.keys(GAMES) as GameId[]).map(g => (
            <div key={g} className={`mini-card ${GAMES[g].cls}`} style={{ padding: 12 }}>
              <div className="row" style={{ gap: 6 }}><GameMark game={g} size={26} /><b>{GAMES[g].name}</b></div>
              <div style={{ fontSize: 11.5, fontWeight: 800, marginTop: 8 }}>Michezo {s.stats[g].played} · Ushindi {s.stats[g].won}</div>
              <div className="display" style={{ fontSize: 30 }}>{s.stats[g].best.toLocaleString()}<span style={{ fontSize: 13 }}> bora</span></div>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div className="row" style={{ gap: 8, marginBottom: 10 }}><GameMark game="fumbua" size={24} /><b>Fumbua · majaribio</b></div>
          {s.fumbuaDist.map((n, i) => (
            <div key={i} className="row" style={{ gap: 8, marginBottom: 5 }}>
              <span style={{ width: 14, fontWeight: 900, fontSize: 13 }}>{i < 6 ? i + 1 : 'X'}</span>
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(9, (n / maxDist) * 100)}%` }} transition={{ ...spring, delay: i * .05 }}
                style={{ height: 22, borderRadius: 6, border: '2px solid var(--ink)', background: n ? (i < 6 ? 'var(--green)' : 'var(--red)') : 'var(--soft)', color: '#fff', fontSize: 12, fontWeight: 900, textAlign: 'right', padding: '1px 7px' }}>{n}</motion.div>
            </div>
          ))}
        </div>

        <div className="h-sec"><h2>Medali</h2><span className="mute" style={{ fontWeight: 800, fontSize: 12 }}>{medals.filter(m => m.got).length}/{medals.length}</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {medals.map((m, i) => (
            <div key={m.name} style={{ textAlign: 'center', opacity: m.got ? 1 : .4 }}>
              <motion.div whileHover={{ rotate: -8 }} style={{ width: 62, height: 62, margin: '0 auto', borderRadius: '50%', display: 'grid', placeItems: 'center', background: m.got ? m.color : 'var(--soft)', border: 'var(--line)', boxShadow: m.got ? '3px 3px 0 var(--ink)' : 'none', transform: `rotate(${(i % 3 - 1) * 4}deg)`, color: '#141414' }}>
                <Icon name={m.got ? m.icon : 'lock'} size={30} fill="#fffdf8" />
              </motion.div>
              <div style={{ fontSize: 10.5, fontWeight: 900, marginTop: 6, lineHeight: 1.15 }}>{m.name}</div>
            </div>
          ))}
        </div>

        <div className="h-sec"><h2>Mandhari</h2></div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          {ownedThemes.map(t => (
            <button key={t} onClick={() => { s.updateMe({ theme: t }); sfx.tap() }} style={{ width: 54, height: 54, borderRadius: '50%', border: 'var(--line)', background: `linear-gradient(135deg, ${THEMES[t].bg} 50%, ${THEMES[t].accent} 50%)`, boxShadow: s.theme === t ? '0 0 0 3px var(--bg), 0 0 0 6px var(--ink)' : 'none' }} title={THEMES[t].name} />
          ))}
          <button className="chip" onClick={() => useNav.getState().go('duka')}>Zaidi dukani <Icon name="next" size={12} /></button>
        </div>

        <div className="h-sec"><h2>Mipangilio</h2></div>
        <div className="card" style={{ display: 'grid', gap: 14 }}>
          <label className="row"><Icon name="pin" size={20} /><span className="grow" style={{ fontWeight: 800 }}>Mkoa</span>
            <select className="field" style={{ width: 170, height: 42 }} value={s.region} onChange={e => s.updateMe({ region: e.target.value })}>
              {REGIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </label>
          <Toggle icon="sound" label="Sauti" on={s.sound} set={v => { s.set({ sound: v }); setSound(v); sfx.tap() }} />
          <Toggle icon="phone" label="Mtetemo" on={s.haptics} set={v => { s.set({ haptics: v }); setHaptics(v) }} />
        </div>

        {!isStandalone() && (
          <motion.button whileTap={{ scale: .98 }} className="card" onClick={() => setInstall(true)} style={{ width: '100%', marginTop: 14, display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left' }}>
            <img src="/icon-192.png" alt="" width={40} height={40} style={{ borderRadius: 11, border: '2px solid var(--edge)' }} />
            <div className="grow"><div style={{ fontWeight: 900 }}>Weka Ubongo kwenye simu</div><div className="mute" style={{ fontSize: 12.5, fontWeight: 700 }}>Ifungue kama app, skrini nzima</div></div>
            <Icon name="download" size={20} fill="var(--gold)" />
          </motion.button>
        )}
        <motion.button whileTap={{ scale: .98 }} className="card" onClick={() => openAd(true)} style={{ width: '100%', marginTop: 14, display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left', background: 'var(--gold)', color: '#141414' }}>
          <Icon name="megaphone" size={36} fill="#fffdf8" />
          <div className="grow"><div className="display" style={{ fontSize: 24 }}>Tangaza na Ubongo</div><div style={{ fontSize: 12.5, fontWeight: 700 }}>Weka biashara yako mbele ya wachezaji</div></div>
          <Icon name="next" size={20} />
        </motion.button>

        <div className="h-sec"><h2>Akaunti</h2></div>
        <div className="card" style={{ marginBottom: 14 }}>
          <button className="row" style={{ width: '100%' }} onClick={() => setPwOpen(v => !v)}>
            <Icon name="lock" size={22} />
            <span className="grow" style={{ textAlign: 'left' }}>
              <b style={{ display: 'block' }}>{s.hasPassword ? 'Badilisha nenosiri' : 'Weka nenosiri'}</b>
              <span className="mute" style={{ fontSize: 12, fontWeight: 700 }}>{s.hasPassword ? 'Unaingia kwa jina lako na nenosiri' : 'Ili uingie kwa jina lako kwenye simu nyingine'}</span>
            </span>
            <motion.span animate={{ rotate: pwOpen ? 90 : 0 }}><Icon name="next" size={18} /></motion.span>
          </button>
          {pwOpen && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              {s.hasPassword && <PasswordField value={cur} onChange={setCur} placeholder="Nenosiri la sasa" />}
              <PasswordField value={npw} onChange={setNpw} placeholder="Nenosiri jipya (angalau 6)" autoComplete="new-password" onEnter={savePassword} />
              <button className="btn ink block" disabled={pwBusy || npw.length < 6 || (s.hasPassword && !cur)} onClick={savePassword}>{pwBusy ? 'Inahifadhi…' : 'Hifadhi nenosiri'}</button>
              {s.hasPassword && <p className="mute" style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>Umesahau la sasa? Toka, kisha tumia “Umesahau nenosiri?” pamoja na msimbo wa kurejesha hapa chini.</p>}
            </motion.div>
          )}
        </div>
        <div className="ticket" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>
          <div className="t-side">KUREJESHA</div>
          <div className="t-body">
            <small style={{ fontWeight: 900, letterSpacing: '.12em', fontSize: 10.5 }}>MSIMBO WAKO WA SIRI</small>
            <button onClick={() => { navigator.clipboard?.writeText(s.recoveryCode); s.notify('Msimbo umenakiliwa', 'copy') }} className="row" style={{ justifyContent: 'space-between' }}>
              <span className="display" style={{ fontSize: 28, letterSpacing: '.04em' }}>{s.recoveryCode || '—'}</span>
              <Icon name="copy" size={22} />
            </button>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: .75 }}>Ukibadilisha simu, rejesha mchezo wako wote kwa msimbo huu.</div>
          </div>
        </div>
        {restore ? (
          <div className="row" style={{ marginTop: 12 }}>
            <input className="field" placeholder="UBG-XXXX-XXXX" value={code} onChange={e => setCode(e.target.value.toUpperCase())} style={{ height: 46 }} />
            <button className="btn small ink" disabled={code.length < 10} onClick={doRestore}>Rejesha</button>
          </div>
        ) : (
          <button className="mute" style={{ marginTop: 12, fontSize: 13, fontWeight: 800 }} onClick={() => setRestore(true)}>Una akaunti nyingine? Irejeshe →</button>
        )}
        <button className="row mute" style={{ margin: '22px auto 0', fontSize: 13, fontWeight: 800, gap: 6 }}
          onClick={() => { if (confirm('Toka kwenye akaunti hii? Utahitaji msimbo wa kurejesha kurudi.')) s.signOut() }}><Icon name="logout" size={16} /> Toka</button>
      </div>

      <InstallGuide open={install} onClose={() => setInstall(false)} />
      <Sheet open={pickAvatar} onClose={() => setPickAvatar(false)}>
        <h3 className="display" style={{ fontSize: 32, marginBottom: 14 }}>Chagua mnyama wako</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {AVATARS.map((a, i) => (
            <motion.button whileTap={{ scale: .88, rotate: -6 }} key={a} onClick={() => { s.updateMe({ avatar: a }); sfx.pop(); setPickAvatar(false) }}
              style={{ textAlign: 'center', fontSize: 11, fontWeight: 800 }}>
              <div style={{ borderRadius: '50%', border: 'var(--line)', boxShadow: s.avatar === a ? '4px 4px 0 var(--ink)' : 'none', transform: s.avatar === a ? 'translate(-2px,-2px)' : `rotate(${(i % 3 - 1) * 3}deg)`, overflow: 'hidden', background: 'var(--paper)' }}><AnimalArt id={a} size={70} /></div>
              <div style={{ marginTop: 4 }}>{ANIMAL_NAMES[a]}</div>
            </motion.button>
          ))}
        </div>
      </Sheet>
    </>
  )
}

const Stat = ({ v, l }: { v: string; l: string }) => (
  <div><div className="display" style={{ fontSize: 30 }}>{v}</div><div className="mute" style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase' }}>{l}</div></div>
)
function Toggle({ icon, label, on, set }: { icon: IconName; label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <button className="row" onClick={() => set(!on)}>
      <Icon name={icon} size={20} />
      <span className="grow" style={{ textAlign: 'left', fontWeight: 800 }}>{label}</span>
      <span style={{ width: 54, height: 32, borderRadius: 16, background: on ? 'var(--green)' : 'var(--soft)', border: 'var(--line)', position: 'relative', transition: 'background .2s' }}>
        <motion.span animate={{ x: on ? 22 : 0 }} transition={spring} style={{ position: 'absolute', top: 2, left: 2, width: 24, height: 24, borderRadius: 12, background: '#fffdf8', border: '2px solid #141414' }} />
      </span>
    </button>
  )
}
