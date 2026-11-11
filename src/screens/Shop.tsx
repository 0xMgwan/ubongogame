import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { COIN_PACKS, FRAMES, FrameId, GEM_PACKS, ITEMS, Me, PRO, REWARD_AD, THEMES, ThemeId, useStore } from '../lib/store'
import { useNav } from '../lib/nav'
import { api } from '../lib/api'
import { sfx } from '../lib/sound'
import { Avatar, Checkout, Confetti, RewardedAd, TopBar } from '../components/ui'
import { Icon } from '../components/icons'

type Buy = { title: string; tzs: number; product: string } | null

export default function Shop() {
  const s = useStore()
  const focus = useNav(n => n.shopFocus)
  const [checkout, setCheckout] = useState<Buy>(null)
  const [ad, setAd] = useState(false)
  const [boom, setBoom] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [, tick] = useState(0)
  const refs = { pro: useRef<HTMLDivElement>(null), gems: useRef<HTMLDivElement>(null), coins: useRef<HTMLDivElement>(null) }
  useEffect(() => { if (focus && refs[focus as keyof typeof refs]?.current) setTimeout(() => refs[focus as keyof typeof refs].current!.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150) }, [focus])
  useEffect(() => { const iv = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(iv) }, [])

  const buy = async (sku: string, label: string) => {
    if (busy) return
    setBusy(sku)
    try {
      const r = await api<{ me: Me }>('/shop/buy', { body: { sku } })
      s.applyMe(r.me); sfx.coin(); s.notify(label, 'bag')
    } catch (e) { sfx.bad(); s.fail(e) } finally { setBusy(null) }
  }
  const claimAd = async (adViewId: string) => {
    setAd(false)
    try {
      const r = await api<{ coins: number; me: Me }>('/ads/claim', { body: { adViewId } })
      s.applyMe(r.me); s.notify(`+${r.coins} sarafu`, 'coin')
    } catch (e) { s.fail(e) }
  }
  const adWait = Math.max(0, Math.ceil((REWARD_AD.cooldownMs - (Date.now() - s.lastRewardAd)) / 1000))
  const proDays = s.pro ? Math.ceil((s.proUntil - Date.now()) / 86400_000) : 0

  return (
    <>
      <TopBar />
      <div className="screen">
        <span className="kicker"><Icon name="bag" size={13} /> Duka la Ubongo</span>
        <h1 className="display" style={{ fontSize: 56, margin: '10px 0 16px' }}>Duka<span className="hl">.</span></h1>

        <div ref={refs.pro} className="pro-card">
          <div className="shine" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="row">
              <motion.div animate={{ y: [0, -5, 0], rotate: [-6, 6, -6] }} transition={{ repeat: Infinity, duration: 2 }}><Icon name="crown" size={50} fill="#f5b800" /></motion.div>
              <div className="grow">
                <div className="display" style={{ fontSize: 34, color: 'var(--gold)' }}>Ubongo Kifalme</div>
                <div style={{ opacity: .75, fontWeight: 700, fontSize: 13 }}>Kwa wale wanaotaka kuwa juu kabisa</div>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 9, margin: '16px 0' }}>
              {([['ban', 'Hakuna matangazo kabisa'], ['coin', 'Sarafu ×2 kila mchezo'], ['bulb', `Dokezo ${PRO.dailyHints} bure kila siku`], ['crown', 'Taji la dhahabu + beji ya KIFALME'], ['star', 'Mandhari ya Dhahabu ya kipekee']] as const).map(([ic, b]) => (
                <div key={b} className="row" style={{ fontWeight: 700, fontSize: 14, gap: 10 }}><Icon name={ic} size={20} fill="#f5b800" />{b}</div>
              ))}
            </div>
            <button className="btn block gold" onClick={() => setCheckout({ title: `Ubongo Kifalme · siku ${PRO.days}`, tzs: PRO.tzs, product: PRO.id })}>
              {s.pro ? `✓ Kifalme · siku ${proDays} zimebaki · Ongeza` : `Jiunge · TZS ${PRO.tzs.toLocaleString()}/mwezi`}
            </button>
          </div>
        </div>

        <motion.button whileTap={{ scale: .98 }} className="card" disabled={adWait > 0} onClick={() => setAd(true)}
          style={{ width: '100%', marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', opacity: adWait ? .5 : 1 }}>
          <Icon name="video" size={34} />
          <div className="grow"><div style={{ fontWeight: 900 }}>Sarafu za bure</div><div className="mute" style={{ fontSize: 12.5, fontWeight: 700 }}>Tazama tangazo la sekunde 5 · +{REWARD_AD.coins} sarafu</div></div>
          <span className="chip">{adWait ? `${adWait}s` : 'Tazama'}</span>
        </motion.button>

        <Section title="Vifaa vya Ubongo">
          <div className="grid2">
            {ITEMS.map(it => (
              <div key={it.id} className="shop-item">
                <motion.div whileHover={{ rotate: -8, scale: 1.1 }}><Icon name={it.icon} size={46} /></motion.div>
                <div style={{ fontWeight: 800 }}>{it.name}</div>
                <div className="mute" style={{ fontSize: 12, fontWeight: 700, minHeight: 30 }}>{it.desc}<br />Unazo: <b>{s.inv[it.id] ?? 0}</b></div>
                <button className="btn small block" disabled={busy === 'item:' + it.id} onClick={() => buy('item:' + it.id, `${it.name} imenunuliwa`)}>
                  <Icon name={it.cur === 'coins' ? 'coin' : 'gem'} size={18} /> {it.price}
                </button>
              </div>
            ))}
          </div>
        </Section>

        <div ref={refs.gems} />
        <Section title="Almasi">
          <div className="grid2">
            {GEM_PACKS.map((p, i) => (
              <motion.button whileTap={{ scale: .96 }} key={p.id} className="shop-item" style={i === 1 ? { background: '#cdf3fb', color: '#141414' } : undefined}
                onClick={() => setCheckout({ title: `Almasi ${p.gems}`, tzs: p.tzs, product: p.id })}>
                {p.tag && <span className="ribbon">{p.tag}</span>}
                <div className="row" style={{ gap: 0 }}>{Array.from({ length: i + 1 }, (_, k) => <Icon key={k} name="gem" size={30} style={{ marginLeft: k ? -12 : 0, transform: `rotate(${(k - i / 2) * 10}deg)` }} />)}</div>
                <div className="display" style={{ fontSize: 30 }}>{p.gems}</div>
                <span className="chip ink">TSh {p.tzs.toLocaleString()}</span>
              </motion.button>
            ))}
          </div>
        </Section>

        <div ref={refs.coins} />
        <Section title="Sarafu">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {COIN_PACKS.map((p, i) => (
              <motion.button whileTap={{ scale: .96 }} key={p.id} className="shop-item" onClick={() => buy(p.id, `+${p.coins} sarafu`)}>
                <div className="row" style={{ gap: 0 }}>{Array.from({ length: i + 1 }, (_, k) => <Icon key={k} name="coin" size={28} style={{ marginLeft: k ? -12 : 0 }} />)}</div>
                <div className="display" style={{ fontSize: 24 }}>{p.coins.toLocaleString()}</div>
                <span className="chip"><Icon name="gem" size={14} /> {p.gems}</span>
              </motion.button>
            ))}
          </div>
        </Section>

        <Section title="Mandhari">
          <div className="grid2">
            {(Object.keys(THEMES) as ThemeId[]).map(id => {
              const t = THEMES[id]; const owned = s.ownedThemes.includes(id) && (!t.pro || s.pro); const on = s.theme === id
              return (
                <button key={id} className="shop-item" style={on ? { borderColor: '#fff' } : undefined} onClick={() => {
                  if (owned) { if (!on) { s.updateMe({ theme: id }); sfx.tap() } return }
                  if (t.pro) { s.notify('Ni kwa Kifalme pekee', 'crown'); return }
                  buy('theme:' + id, `${t.name} imefunguliwa`)
                }}>
                  <div className="swatch"><div style={{ background: t.bg }} /><div style={{ background: t.paper }} /><div style={{ background: t.accent }} /></div>
                  <div style={{ fontWeight: 900, fontSize: 13 }}>{t.name}</div>
                  <span className={`chip ${on ? 'ink' : ''}`}>{on ? 'Inatumika' : owned ? 'Tumia' : t.pro ? <><Icon name="crown" size={13} /> Kifalme</> : <><Icon name={t.cur === 'coins' ? 'coin' : 'gem'} size={14} /> {t.price}</>}</span>
                </button>
              )
            })}
          </div>
        </Section>

        <Section title="Fremu za Picha">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {(Object.keys(FRAMES) as FrameId[]).map(id => {
              const f = FRAMES[id]; const owned = s.ownedFrames.includes(id) && (!f.pro || s.pro); const on = s.frame === id
              return (
                <button key={id} className="shop-item" style={on ? { borderColor: '#fff' } : undefined} onClick={() => {
                  if (owned) { if (!on) { s.updateMe({ frame: id }); sfx.tap() } return }
                  if (f.pro) { s.notify('Ni kwa Kifalme pekee', 'crown'); return }
                  buy('frame:' + id, `Fremu ${f.name} imefunguliwa`)
                }}>
                  <div style={{ padding: 8 }}><Avatar size={50} frame={id} /></div>
                  <div style={{ fontWeight: 800, fontSize: 12 }}>{f.name}</div>
                  <span className={`chip ${on ? 'ink' : ''}`} style={{ fontSize: 11 }}>{on ? 'Ipo' : owned ? 'Tumia' : f.pro ? <Icon name="crown" size={13} /> : <><Icon name={f.cur === 'coins' ? 'coin' : 'gem'} size={13} /> {f.price}</>}</span>
                </button>
              )
            })}
          </div>
        </Section>
      </div>

      <Checkout open={!!checkout} title={checkout?.title ?? ''} amount={checkout?.tzs ?? 0} product={checkout?.product ?? ''}
        onClose={() => setCheckout(null)} onPaid={() => setBoom(b => b + 1)} />
      <RewardedAd open={ad} reward={`+${REWARD_AD.coins} sarafu`} onClose={() => setAd(false)} onDone={claimAd} />
      <Confetti fire={boom} />
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div className="h-sec" style={{ marginTop: 0 }}><h2>{title}</h2></div>
      {children}
    </div>
  )
}
