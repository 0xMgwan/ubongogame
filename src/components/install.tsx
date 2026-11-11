// "Add Ubongo to your home screen": iPhone gets illustrated Safari steps, Android gets the real
// one-tap install when Chrome offers it (beforeinstallprompt), otherwise menu steps.
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Sheet } from './ui'
import { Icon, IconName } from './icons'
import { sfx } from '../lib/sound'

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
let deferred: BIP | null = null
const listeners = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e as BIP; listeners.forEach(f => f()) })
  window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach(f => f()) })
}

export const isStandalone = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true)
export function platform(): 'ios' | 'android' | 'other' {
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'other'
}
/** Show the guide automatically once, on phones, when not already installed. */
export function shouldAutoShowInstall() {
  try { if (localStorage.getItem('ubongo-install-seen')) return false } catch { /* ignore */ }
  return !isStandalone() && platform() !== 'other'
}
export const markInstallSeen = () => { try { localStorage.setItem('ubongo-install-seen', '1') } catch { /* ignore */ } }

function useDeferred() {
  const [, set] = useState(0)
  useEffect(() => { const f = () => set(x => x + 1); listeners.add(f); return () => { listeners.delete(f) } }, [])
  return deferred
}

function Step({ n, icon, children, hl }: { n: number; icon: IconName; children: React.ReactNode; hl?: boolean }) {
  return (
    <motion.div initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: n * .12 }} className="row"
      style={{ gap: 12, padding: '10px 12px', border: 'var(--line)', borderRadius: 16, background: hl ? 'var(--gold)' : 'var(--paper)', color: hl ? '#141414' : undefined, boxShadow: '3px 3px 0 var(--edge)' }}>
      <span style={{ width: 28, height: 28, flex: 'none', borderRadius: '50%', background: 'var(--ink)', color: 'var(--bg)', display: 'grid', placeItems: 'center', fontFamily: 'var(--display)', fontWeight: 900 }}>{n}</span>
      <div className="grow" style={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.35 }}>{children}</div>
      <span style={{ width: 42, height: 42, flex: 'none', borderRadius: 12, border: '2px solid var(--edge)', display: 'grid', placeItems: 'center', background: 'var(--paper)', color: 'var(--ink)' }}><Icon name={icon} size={24} fill="var(--gold)" /></span>
    </motion.div>
  )
}

export function InstallGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const d = useDeferred()
  const p = typeof navigator !== 'undefined' ? platform() : 'other'
  const close = () => { markInstallSeen(); onClose() }
  const install = async () => {
    if (!d) return
    sfx.tap()
    await d.prompt()
    const { outcome } = await d.userChoice
    if (outcome === 'accepted') { sfx.win(); close() }
  }
  const installed = isStandalone()
  return (
    <Sheet open={open} onClose={close}>
      <div style={{ textAlign: 'center' }}>
        <motion.img src="/icon-192.png" alt="" width={84} height={84} initial={{ rotate: -12, scale: .6 }} animate={{ rotate: -4, scale: 1 }}
          style={{ borderRadius: 22, border: '3px solid var(--edge)', boxShadow: 'var(--shadow)' }} />
        <h2 className="display" style={{ fontSize: 38, marginTop: 14 }}>Weka Ubongo <span className="hl">kwenye simu.</span></h2>
        <p style={{ fontWeight: 700, margin: '6px 0 16px' }}>Fungua kwa kugusa mara moja, skrini nzima, kama app nyingine.</p>
      </div>
      {installed ? (
        <div className="card" style={{ textAlign: 'center' }}><span className="stamp green" style={{ fontSize: 18 }}>Imewekwa</span><p style={{ fontWeight: 700 }}>Tayari unatumia Ubongo kama app.</p></div>
      ) : p === 'ios' ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <Step n={1} icon="iosShare">Gusa kitufe cha <b>Share</b> chini ya Safari (kisanduku chenye mshale juu)</Step>
          <Step n={2} icon="addHome">Shuka chini, chagua <b>“Add to Home Screen”</b></Step>
          <Step n={3} icon="check" hl>Gusa <b>Add</b> juu kulia — Ubongo itaonekana kwenye skrini yako</Step>
          <p className="mute" style={{ fontSize: 12, fontWeight: 700, textAlign: 'center', margin: '4px 0 0' }}>Kwenye Chrome ya iPhone: kitufe cha Share kiko juu karibu na anwani.</p>
        </div>
      ) : d ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <button className="btn gold block nudge" style={{ height: 60, fontSize: 18 }} onClick={install}><Icon name="download" size={22} fill="#fffdf8" /> Install Ubongo</button>
          <p className="mute" style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'center', margin: 0 }}>Haichukui nafasi kubwa — chini ya MB 1.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          <Step n={1} icon="dots">Gusa menyu <b>⋮</b> juu kulia ya Chrome</Step>
          <Step n={2} icon="download"><b>“Install app”</b> au <b>“Add to Home screen”</b></Step>
          <Step n={3} icon="check" hl>Thibitisha <b>Install</b> — Ubongo itakuwa kwenye skrini yako</Step>
        </div>
      )}
      <button className="mute" style={{ display: 'block', margin: '16px auto 0', fontWeight: 800 }} onClick={close}>Baadaye</button>
    </Sheet>
  )
}
