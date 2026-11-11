import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNav } from '../lib/nav'
import { AD_COLORS, AD_ICONS, AD_SLOTS, adDiscount, adPrice, useStore } from '../lib/store'
import { Icon, IconName } from '../components/icons'
import { AdIcon } from '../components/ui'
import { api } from '../lib/api'
import { sfx } from '../lib/sound'
import { Checkout, spring } from '../components/ui'
const SLOT_ICONS: Record<string, IconName> = { banner: 'home', result: 'trophy', reward: 'video', league: 'star', daily: 'calendar' }

type Campaign = { id: number; slot: string; brand: string; line: string; days: number; price_tzs: number; status: string; review_note: string | null; ends_at: number | null; impressions: number; clicks: number }
const STATUS: Record<string, [string, string]> = {
  awaiting_payment: ['Inasubiri malipo', '#f5b800'], in_review: ['Inakaguliwa', '#8ec1ff'],
  live: ['Hewani', '#7ed6a8'], rejected: ['Imekataliwa', '#ff8f7a'], ended: ['Imeisha', '#e9e2d3'],
}

export default function Advertise() {
  const close = useNav(n => n.openAdvertise)
  const s = useStore()
  const [slot, setSlot] = useState(AD_SLOTS[0].id)
  const [days, setDays] = useState(7)
  const [brand, setBrand] = useState('')
  const [line, setLine] = useState('')
  const [icon, setIcon] = useState<string>(AD_ICONS[0])
  const [color, setColor] = useState(AD_COLORS[0])
  const [contact, setContact] = useState('')
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [mine, setMine] = useState<Campaign[]>([])
  const [paying, setPaying] = useState<Campaign | null>(null)
  const discount = adDiscount(days)
  const total = adPrice(slot, days)
  const refresh = () => api<{ campaigns: Campaign[] }>('/ads/mine').then(r => setMine(r.campaigns)).catch(() => {})
  useEffect(() => { refresh() }, [])

  const submit = async () => {
    if (!brand.trim()) { sfx.bad(); s.notify('Andika jina la biashara', 'ban'); return }
    setBusy(true)
    try {
      const r = await api<{ campaign: Campaign }>('/ads', { body: { slot, brand, line, icon, color, days, contact, link: link.trim() || undefined } })
      sfx.good(); setBrand(''); setLine(''); setLink('')
      await refresh()
      setPaying(r.campaign)
    } catch (e) { sfx.bad(); s.fail(e) } finally { setBusy(false) }
  }

  return (
    <>
    <motion.div className="screen" style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'var(--app-bg, #0b0a1f)', paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: 40 }}
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={spring}>
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="icon-btn" onClick={() => close(false)} aria-label="Rudi"><Icon name="back" size={22} /></button>
        <span className="kicker"><Icon name="megaphone" size={13} /> Ubongo Ads</span>
      </div>
      <h1 className="display" style={{ fontSize: 54 }}>Tangaza kwa <span className="hl">bongo</span> <span className="hl red">zinazochemka.</span></h1>
      <p className="muted" style={{ fontWeight: 600 }}>Wachezaji hutumia wastani wa dakika 14 kwa siku kwenye Ubongo. Weka biashara yako pale macho yao yalipo.</p>
      <div className="row" style={{ gap: 8, margin: '14px 0' }}>
        {[['48K', 'Wachezaji/mwezi'], ['14 dk', 'Kwa siku'], ['72%', 'Miaka 18–34']].map(([v, l]) => (
          <div key={l} className="card" style={{ flex: 1, padding: 12, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22 }}>{v}</div>
            <div className="mute" style={{ fontSize: 10.5, fontWeight: 800 }}>{l}</div>
          </div>
        ))}
      </div>
      <p className="mute" style={{ fontSize: 11, marginTop: -6 }}>* Takwimu za mfano kwa demo.</p>

      <div className="kicker" style={{ margin: '22px 2px 10px' }}>1 · Chagua nafasi</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {AD_SLOTS.map(a => (
          <button key={a.id} className="card row" onClick={() => { setSlot(a.id); sfx.tap() }} style={{ padding: 12, textAlign: 'left', borderColor: slot === a.id ? '#ffcb47' : undefined, background: slot === a.id ? 'rgba(255,203,71,.1)' : undefined }}>
            <Icon name={SLOT_ICONS[a.id] ?? 'star'} size={30} />
            <div className="grow"><div style={{ fontWeight: 800 }}>{a.name}</div><div className="mute" style={{ fontSize: 12, fontWeight: 600 }}>{a.where} · {a.reach}</div></div>
            <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 800, fontSize: 13 }}>TSh {a.price.toLocaleString()}</div><div className="mute" style={{ fontSize: 10 }}>/siku</div></div>
          </button>
        ))}
      </div>

      <div className="kicker" style={{ margin: '22px 2px 10px' }}>2 · Tangazo lako</div>
      <div style={{ display: 'grid', gap: 8 }}>
        <input className="field" placeholder="Jina la biashara" value={brand} maxLength={28} onChange={e => setBrand(e.target.value)} />
        <input className="field" placeholder="Ujumbe mfupi (mf. Punguzo 20% wiki hii)" value={line} maxLength={60} onChange={e => setLine(e.target.value)} />
        <input className="field" placeholder="Kiungo (hiari) — https://…" value={link} maxLength={120} inputMode="url" onChange={e => setLink(e.target.value)} />
        <input className="field" placeholder="Simu au barua pepe ya mawasiliano" value={contact} maxLength={40} onChange={e => setContact(e.target.value)} />
        <div className="row" style={{ gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {AD_ICONS.map(e => <button key={e} onClick={() => setIcon(e)} style={{ width: 46, height: 46, flex: 'none', borderRadius: 12, border: 'var(--line)', display: 'grid', placeItems: 'center', background: icon === e ? 'var(--gold)' : 'var(--paper)', color: icon === e ? '#141414' : undefined, boxShadow: icon === e ? '2px 2px 0 var(--ink)' : 'none' }}><Icon name={e} size={24} fill="#fffdf8" /></button>)}
        </div>
        <div className="row" style={{ gap: 8 }}>
          {AD_COLORS.map(g => <button key={g} onClick={() => setColor(g)} style={{ flex: 1, height: 34, borderRadius: 10, background: g, border: 'var(--line)', boxShadow: color === g ? '3px 3px 0 var(--ink)' : 'none', transform: color === g ? 'translate(-2px,-2px)' : 'none' }} />)}
        </div>
      </div>
      <div className="mute" style={{ fontSize: 11, fontWeight: 800, margin: '12px 2px 6px' }}>MUONEKANO</div>
      <div className="ad" style={{ background: color, color: color === '#141414' ? '#fffdf8' : '#141414' }}>
        <span className="ad-tag">Tangazo</span>
        <AdIcon sp={{ icon, color: '#fffdf8' }} />
        <div className="grow"><div style={{ fontWeight: 900 }}>{brand || 'Biashara Yako'}</div><div style={{ fontSize: 12.5, fontWeight: 600 }}>{line || 'Ujumbe wako utaonekana hapa'}</div></div>
        <span className="chip ink">Tazama</span>
      </div>

      <div className="kicker" style={{ margin: '22px 2px 10px' }}>3 · Muda</div>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}><b>Siku {days}</b>{discount > 0 && <span className="chip" style={{ background: 'var(--good)', color: '#04281c' }}>Punguzo {discount * 100}%</span>}</div>
        <input type="range" min={1} max={30} value={days} onChange={e => setDays(+e.target.value)} style={{ width: '100%', marginTop: 10, accentColor: '#ffcb47' }} />
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
          <span className="muted" style={{ fontWeight: 700 }}>Jumla</span>
          <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 28 }}>TSh {total.toLocaleString()}</span>
        </div>
      </div>
      <button className="btn gold block" style={{ marginTop: 14 }} disabled={busy} onClick={submit}>{busy ? 'Inatuma…' : 'Endelea kulipa'}</button>
      <p className="mute" style={{ fontSize: 11.5, textAlign: 'center', marginTop: 8 }}>Ukishalipa, tunakagua tangazo (kwa kawaida ndani ya saa 24) kisha linaanza kuonekana.</p>

      {mine.length > 0 && (
        <>
          <div className="kicker" style={{ margin: '22px 2px 10px' }}>Matangazo yako</div>
          {mine.map(c => (
            <div key={c.id} className="card" style={{ padding: 12, marginBottom: 8 }}>
              <div className="row">
                <div className="grow"><b>{c.brand}</b><div className="mute" style={{ fontSize: 12 }}>{AD_SLOTS.find(x => x.id === c.slot)?.name} · siku {c.days} · TSh {c.price_tzs.toLocaleString()}</div></div>
                <span className="chip" style={{ background: STATUS[c.status]?.[1], color: '#141414' }}>{STATUS[c.status]?.[0] ?? c.status}</span>
              </div>
              {c.status === 'live' && <div className="mute" style={{ fontSize: 12, marginTop: 6, fontWeight: 700 }}><Icon name="eye" size={13} /> {c.impressions.toLocaleString()} · <Icon name="tap" size={13} /> {c.clicks.toLocaleString()} · hadi {new Date(c.ends_at!).toLocaleDateString('sw-TZ')}</div>}
              {c.status === 'rejected' && c.review_note && <div style={{ fontSize: 12, marginTop: 6, color: '#ff8fa3' }}>{c.review_note}</div>}
              {c.status === 'awaiting_payment' && <button className="btn small gold" style={{ marginTop: 8 }} onClick={() => setPaying(c)}>Lipa TSh {c.price_tzs.toLocaleString()}</button>}
            </div>
          ))}
        </>
      )}
    </motion.div>
    <Checkout open={!!paying} title={paying ? `Tangazo · ${paying.brand}` : ''} amount={paying?.price_tzs ?? 0} product="ad" campaignId={paying?.id}
      onClose={() => { setPaying(null); refresh() }} onPaid={() => { refresh(); s.notify('Asante! Tangazo linakaguliwa', 'megaphone') }} />
    </>
  )
}
