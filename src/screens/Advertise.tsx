import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useNav } from '../lib/nav'
import { AD_COLORS, AD_ICONS, AD_SLOTS, adDiscount, adPrice, useStore } from '../lib/store'
import { api, upload } from '../lib/api'
import { sfx } from '../lib/sound'
import { AdIcon, AdPicture, Checkout, spring } from '../components/ui'
import { Icon, IconName } from '../components/icons'

const SLOT_ICONS: Record<string, IconName> = { banner: 'home', result: 'trophy', reward: 'video', league: 'star', daily: 'calendar' }
const MAX = 3 * 1024 * 1024

type Campaign = {
  id: number; slot: string; brand: string; line: string; icon: string; color: string; image: string | null; pdf: string | null
  days: number; price_tzs: number; status: string; review_note: string | null; ends_at: number | null; impressions: number; clicks: number
}
type Uploaded = { id: string; url: string; size: number; name: string }
const STATUS: Record<string, [string, string]> = {
  awaiting_payment: ['Inasubiri malipo', '#f5b800'], in_review: ['Inakaguliwa', '#8ec1ff'],
  live: ['Hewani', '#7ed6a8'], rejected: ['Imekataliwa', '#ff8f7a'], ended: ['Imeisha', '#e9e2d3'],
}
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

/** Shrink a picture in the browser (max 1400px wide, WebP/JPEG) so uploads stay small and fast. */
async function shrinkImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url })
    const scale = Math.min(1, 1400 / img.naturalWidth)
    const c = document.createElement('canvas')
    c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    const out = await new Promise<Blob | null>(ok => c.toBlob(ok, 'image/webp', 0.85))
    return out && out.type === 'image/webp' ? out : await new Promise<Blob>(ok => c.toBlob(b => ok(b!), 'image/jpeg', 0.85))
  } finally { URL.revokeObjectURL(url) }
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
  const [image, setImage] = useState<Uploaded | null>(null)
  const [pdf, setPdf] = useState<Uploaded | null>(null)
  const [uploading, setUploading] = useState<'image' | 'pdf' | null>(null)
  const [busy, setBusy] = useState(false)
  const [mine, setMine] = useState<Campaign[]>([])
  const [paying, setPaying] = useState<Campaign | null>(null)
  const discount = adDiscount(days)
  const total = adPrice(slot, days)
  const refresh = () => api<{ campaigns: Campaign[] }>('/ads/mine').then(r => setMine(r.campaigns)).catch(() => {})
  useEffect(() => { refresh() }, [])

  const pick = async (kind: 'image' | 'pdf', file?: File | null) => {
    if (!file) return
    if (kind === 'pdf' && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { s.notify('Chagua faili la PDF', 'ban'); return }
    if (kind === 'image' && !file.type.startsWith('image/')) { s.notify('Chagua picha (JPG, PNG, WEBP)', 'ban'); return }
    setUploading(kind)
    try {
      const blob = kind === 'image' ? await shrinkImage(file) : file
      if (blob.size > MAX) throw new Error(`Faili ni ${kb(blob.size)} — kikomo ni MB 3`)
      const r = await upload<{ id: string; url: string; size: number }>('/ads/assets', blob)
      const up = { ...r, name: file.name }
      kind === 'image' ? setImage(up) : setPdf(up)
      sfx.good()
    } catch (e: any) { sfx.bad(); s.notify(e?.message ?? 'Imeshindikana kupakia', 'ban') } finally { setUploading(null) }
  }

  const submit = async () => {
    if (!brand.trim()) { sfx.bad(); s.notify('Andika jina la biashara', 'ban'); return }
    setBusy(true)
    try {
      const r = await api<{ campaign: Campaign }>('/ads', { body: { slot, brand, line, icon, color, days, contact, link: link.trim() || undefined, imageId: image?.id, pdfId: pdf?.id } })
      sfx.good(); setBrand(''); setLine(''); setLink(''); setImage(null); setPdf(null)
      await refresh()
      setPaying(r.campaign)
    } catch (e) { sfx.bad(); s.fail(e) } finally { setBusy(false) }
  }

  const preview = { brand: brand || 'Biashara Yako', line: line || 'Ujumbe wako utaonekana hapa', cta: pdf && !link ? 'PDF' : 'Tazama', icon, color, image: image?.url ?? null, pdf: pdf?.url ?? null }

  return (
    <>
      <motion.div className="screen" style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'var(--bg)', paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: 40 }}
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={spring}>
        <div className="row" style={{ marginBottom: 12 }}>
          <button className="icon-btn" onClick={() => close(false)} aria-label="Rudi"><Icon name="back" size={22} /></button>
          <span className="kicker"><Icon name="megaphone" size={13} /> Ubongo Ads</span>
        </div>
        <h1 className="display" style={{ fontSize: 54 }}>Tangaza kwa <span className="hl">bongo</span> <span className="hl red">zinazochemka.</span></h1>
        <p style={{ fontWeight: 700 }}>Weka picha yako, flyer ya PDF au kiungo — mbele ya wachezaji kila siku.</p>

        <Step n={1} title="Chagua nafasi" />
        <div style={{ display: 'grid', gap: 8 }}>
          {AD_SLOTS.map(a => (
            <button key={a.id} className="card row" onClick={() => { setSlot(a.id); sfx.tap() }}
              style={{ padding: 12, textAlign: 'left', background: slot === a.id ? 'var(--gold)' : 'var(--paper)', color: slot === a.id ? '#141414' : undefined, boxShadow: slot === a.id ? 'var(--shadow)' : 'none' }}>
              <Icon name={SLOT_ICONS[a.id] ?? 'star'} size={30} fill="#fffdf8" />
              <div className="grow"><div style={{ fontWeight: 900 }}>{a.name}</div><div style={{ fontSize: 12, fontWeight: 600, opacity: .75 }}>{a.where} · {a.reach}</div></div>
              <div style={{ textAlign: 'right' }}><div className="display" style={{ fontSize: 18 }}>TSh {a.price.toLocaleString()}</div><div style={{ fontSize: 10, fontWeight: 800, opacity: .7 }}>/siku</div></div>
            </button>
          ))}
        </div>

        <Step n={2} title="Tangazo lako" />
        <div style={{ display: 'grid', gap: 8 }}>
          <input className="field" placeholder="Jina la biashara" value={brand} maxLength={28} onChange={e => setBrand(e.target.value)} />
          <input className="field" placeholder="Ujumbe mfupi (mf. Punguzo 20% wiki hii)" value={line} maxLength={60} onChange={e => setLine(e.target.value)} />
        </div>

        <div className="mute" style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', margin: '14px 2px 8px' }}>PICHA NA FLYER (HIARI)</div>
        <div style={{ display: 'grid', gap: 10 }}>
          <Drop kind="image" file={image} busy={uploading === 'image'} onPick={f => pick('image', f)} onClear={() => setImage(null)} />
          <Drop kind="pdf" file={pdf} busy={uploading === 'pdf'} onPick={f => pick('pdf', f)} onClear={() => setPdf(null)} />
        </div>
        <input className="field" style={{ marginTop: 10 }} placeholder="Kiungo cha tovuti (hiari) — https://…" value={link} maxLength={120} inputMode="url" onChange={e => setLink(e.target.value)} />
        <input className="field" style={{ marginTop: 8 }} placeholder="Simu au barua pepe ya mawasiliano" value={contact} maxLength={40} onChange={e => setContact(e.target.value)} />

        {!image && (
          <>
            <div className="mute" style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', margin: '14px 2px 8px' }}>BILA PICHA? CHAGUA ALAMA NA RANGI</div>
            <div className="row" style={{ gap: 6, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
              {AD_ICONS.map(e => <button key={e} onClick={() => setIcon(e)} style={{ width: 46, height: 46, flex: 'none', borderRadius: 12, border: 'var(--line)', display: 'grid', placeItems: 'center', background: icon === e ? 'var(--gold)' : 'var(--paper)', color: icon === e ? '#141414' : undefined, boxShadow: icon === e ? '2px 2px 0 var(--edge)' : 'none' }}><Icon name={e} size={24} fill="#fffdf8" /></button>)}
            </div>
          </>
        )}
        <div className="row" style={{ gap: 8, marginTop: 10 }}>
          {AD_COLORS.map(g => <button key={g} aria-label={`Rangi ${g}`} onClick={() => setColor(g)} style={{ flex: 1, height: 34, borderRadius: 10, background: g, border: 'var(--line)', boxShadow: color === g ? '3px 3px 0 var(--edge)' : 'none', transform: color === g ? 'translate(-2px,-2px)' : 'none' }} />)}
        </div>

        <div className="mute" style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', margin: '16px 2px 8px' }}>MUONEKANO KWA WACHEZAJI</div>
        {preview.image ? <AdPicture sp={preview} /> : (
          <div className="ad" style={{ background: color, color: color === '#141414' ? '#fffdf8' : '#141414' }}>
            <span className="ad-tag">Tangazo</span>
            <AdIcon sp={{ icon, color: '#fffdf8' }} />
            <div className="grow"><div style={{ fontWeight: 900 }}>{preview.brand}</div><div style={{ fontSize: 12.5, fontWeight: 600 }}>{preview.line}</div></div>
            <span className="chip ink">{preview.cta}</span>
          </div>
        )}
        <p className="mute" style={{ fontSize: 12, fontWeight: 700, margin: '8px 2px 0' }}>
          Mchezaji akigusa tangazo: {link ? 'anafungua tovuti yako' : pdf ? 'anafungua flyer yako ya PDF' : 'hakuna kinachofunguka (ongeza kiungo au PDF)'}.
        </p>

        <Step n={3} title="Muda" />
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}><b className="display" style={{ fontSize: 24 }}>Siku {days}</b>{discount > 0 && <span className="chip green">Punguzo {discount * 100}%</span>}</div>
          <input type="range" min={1} max={30} value={days} onChange={e => setDays(+e.target.value)} style={{ width: '100%', marginTop: 10, accentColor: '#e5452b' }} />
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
            <span style={{ fontWeight: 800 }}>Jumla</span>
            <span className="display" style={{ fontSize: 36, color: 'var(--gold)', textShadow: '2px 2px 0 var(--edge)' }}>TSh {total.toLocaleString()}</span>
          </div>
        </div>
        <button className="btn gold block nudge" style={{ marginTop: 16 }} disabled={busy || !!uploading} onClick={submit}>{busy ? 'Inatuma…' : <>Endelea kulipa <Icon name="next" size={18} /></>}</button>
        <p className="mute" style={{ fontSize: 12, textAlign: 'center', marginTop: 10, fontWeight: 700 }}>Ukishalipa, tunakagua tangazo (kwa kawaida ndani ya saa 24) kisha linaanza kuonekana.</p>

        {mine.length > 0 && (
          <>
            <div className="h-sec"><h2>Matangazo yako</h2></div>
            {mine.map(c => (
              <div key={c.id} className="card" style={{ padding: 12, marginBottom: 10 }}>
                <div className="row">
                  {c.image ? <img src={c.image} alt="" style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'cover', border: '2px solid var(--edge)' }} /> : <AdIcon sp={{ icon: c.icon, color: c.color }} size={52} />}
                  <div className="grow">
                    <b>{c.brand}</b>
                    <div className="mute" style={{ fontSize: 12, fontWeight: 700 }}>{AD_SLOTS.find(x => x.id === c.slot)?.name} · siku {c.days} · TSh {c.price_tzs.toLocaleString()}{c.pdf ? ' · PDF' : ''}</div>
                  </div>
                  <span className="chip" style={{ background: STATUS[c.status]?.[1], color: '#141414' }}>{STATUS[c.status]?.[0] ?? c.status}</span>
                </div>
                {c.status === 'live' && <div className="row mute" style={{ fontSize: 12, marginTop: 8, fontWeight: 800, gap: 6 }}><Icon name="eye" size={14} /> {c.impressions.toLocaleString()} <Icon name="tap" size={14} /> {c.clicks.toLocaleString()} · hadi {new Date(c.ends_at!).toLocaleDateString('sw-TZ')}</div>}
                {c.status === 'rejected' && c.review_note && <div style={{ fontSize: 12.5, marginTop: 8, fontWeight: 700, color: 'var(--red)' }}>{c.review_note}</div>}
                {c.status === 'awaiting_payment' && <button className="btn small gold" style={{ marginTop: 10 }} onClick={() => setPaying(c)}>Lipa TSh {c.price_tzs.toLocaleString()}</button>}
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

function Step({ n, title }: { n: number; title: string }) {
  return (
    <div className="row" style={{ margin: '26px 2px 12px', gap: 10 }}>
      <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--ink)', color: 'var(--bg)', display: 'grid', placeItems: 'center', fontFamily: 'var(--display)', fontWeight: 900, fontSize: 16 }}>{n}</span>
      <h2 className="display" style={{ fontSize: 26 }}>{title}</h2>
    </div>
  )
}

function Drop({ kind, file, busy, onPick, onClear }: { kind: 'image' | 'pdf'; file: Uploaded | null; busy: boolean; onPick: (f: File | null) => void; onClear: () => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const isImg = kind === 'image'
  return (
    <div className={`drop ${file ? 'filled' : ''} ${over ? 'over' : ''}`} role="button" tabIndex={0}
      onClick={() => !busy && ref.current?.click()} onKeyDown={e => e.key === 'Enter' && ref.current?.click()}
      onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onPick(e.dataTransfer.files?.[0] ?? null) }}>
      <input ref={ref} type="file" hidden accept={isImg ? 'image/png,image/jpeg,image/webp' : 'application/pdf,.pdf'} onChange={e => { onPick(e.target.files?.[0] ?? null); e.target.value = '' }} />
      {file && isImg ? <img className="thumb" src={file.url} alt="" /> : (
        <div className="thumb" style={{ background: file ? 'var(--red)' : 'var(--soft)', color: file ? '#fff' : undefined }}>
          {busy ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-flex' }}><Icon name="refresh" size={24} /></motion.span>
            : file ? <b className="display" style={{ fontSize: 18 }}>PDF</b> : <Icon name={isImg ? 'picture' : 'file'} size={28} />}
        </div>
      )}
      <div className="grow" style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 900 }}>{busy ? 'Inapakia…' : file ? file.name : isImg ? 'Pakia picha ya tangazo' : 'Pakia flyer ya PDF'}</div>
        <div className="mute" style={{ fontSize: 12, fontWeight: 700 }}>
          {file ? `${kb(file.size)} · imepakiwa` : isImg ? 'JPG, PNG au WEBP · tunaipunguza ukubwa wenyewe' : 'Hadi MB 3 · inafunguka mchezaji akigusa tangazo'}
        </div>
      </div>
      {file && !busy && <button className="icon-btn" style={{ width: 38, height: 38 }} aria-label="Ondoa" onClick={e => { e.stopPropagation(); onClear() }}><Icon name="close" size={16} /></button>}
    </div>
  )
}
