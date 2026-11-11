// Tiny synthesized sound kit — no audio files needed.
let ctx: AudioContext | null = null
let enabled = true
let haptics = true
export function setSound(on: boolean) { enabled = on }
export function setHaptics(on: boolean) { haptics = on }

function ac() {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}
function tone(freq: number, dur = 0.08, type: OscillatorType = 'sine', vol = 0.12, delay = 0, slide = 0) {
  if (!enabled) return
  try {
    const c = ac(); const t = c.currentTime + delay
    const o = c.createOscillator(); const g = c.createGain()
    o.type = type; o.frequency.setValueAtTime(freq, t)
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur)
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02)
  } catch { /* ignore */ }
}
// ---------------------------------------------------------------- haptics
// Android: navigator.vibrate. iPhone Safari has no vibrate API, but iOS 18+ plays a real Taptic tick
// when a native switch toggles — so we flip a hidden <input type="checkbox" switch> (one tick per call).
const isIOS = typeof navigator !== 'undefined' && (/iphone|ipad|ipod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1))
const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function' && !isIOS
let iosSwitch: HTMLLabelElement | null = null
function iosTick() {
  if (!iosSwitch) {
    const label = document.createElement('label')
    label.setAttribute('aria-hidden', 'true')
    label.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none'
    const input = document.createElement('input')
    input.type = 'checkbox'; input.setAttribute('switch', ''); input.tabIndex = -1
    label.appendChild(input); document.body.appendChild(label)
    iosSwitch = label
  }
  iosSwitch.click()
}
let last = 0
export type Haptic = 'light' | 'medium' | 'heavy' | 'select' | 'success' | 'error'
const PATTERN: Record<Haptic, number | number[]> = { select: 5, light: 8, medium: 14, heavy: 24, success: [10, 40, 16], error: [30, 40, 30] }
export function haptic(kind: Haptic = 'light') {
  if (!haptics) return
  const now = performance.now()
  if (now - last < 35) return // one buzz per tap, even if a button also calls sfx
  last = now
  try {
    if (canVibrate) navigator.vibrate(PATTERN[kind])
    else if (isIOS) iosTick()
  } catch { /* blocked before the first interaction — fine */ }
}
/** Older call sites: a vibration pattern → nearest haptic. */
export function buzz(ms: number | number[] = 8) {
  if (Array.isArray(ms)) return haptic(ms[0] >= 25 ? 'error' : 'success')
  haptic(ms <= 5 ? 'select' : ms <= 10 ? 'light' : ms <= 16 ? 'medium' : 'heavy')
}

/** One light tap for every button / link / key in the app (primary buttons feel a little firmer). */
export function installHaptics() {
  const SEL = 'button, a[href], [role="button"], [role="tab"], label, select, input[type="checkbox"], input[type="radio"], input[type="range"], .key, .chip, .pill, .drop'
  const pick = (e: Event) => {
    const el = (e.target as Element | null)?.closest?.(SEL) as HTMLElement | null
    if (!el || el === iosSwitch || el.closest('[aria-hidden="true"]') || (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return null
    return el.matches('.btn.gold, .btn.red, .btn.ink, .btn.green, .btn.blue') ? 'medium' : 'light'
  }
  // Android buzzes on press-down (feels instant); iOS needs a click to count as a user gesture
  document.addEventListener('pointerdown', e => { if (!isIOS) { const k = pick(e); if (k) haptic(k) } }, { capture: true, passive: true })
  document.addEventListener('click', e => { if (isIOS) { const k = pick(e); if (k) haptic(k) } }, { capture: true, passive: true })
}

export const sfx = {
  tap: () => { tone(620, 0.05, 'triangle', 0.07) }, // the global button haptic covers the buzz
  key: () => { tone(420, 0.04, 'triangle', 0.05) },
  chain: (n: number) => { tone(440 * Math.pow(1.0595, Math.min(n, 18) * 2), 0.07, 'sine', 0.09); buzz(4) },
  pop: () => { tone(880, 0.06, 'square', 0.04, 0, 1.6) },
  flip: (i: number) => { tone(300 + i * 60, 0.09, 'triangle', 0.06); haptic('select') },
  good: () => { [523, 659, 784].forEach((f, i) => tone(f, 0.16, 'sine', 0.1, i * 0.06)); buzz([10, 30, 10]) },
  great: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.1, i * 0.07)); buzz([15, 40, 15]) },
  bad: () => { tone(180, 0.18, 'sawtooth', 0.06, 0, 0.6); buzz([30, 40, 30]) },
  coin: () => { tone(988, 0.07, 'square', 0.05); tone(1319, 0.18, 'square', 0.05, 0.07); haptic('medium') },
  win: () => { [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.3, 'triangle', 0.09, i * 0.09)); buzz([20, 50, 20, 50, 60]) },
  whoosh: () => tone(200, 0.25, 'sine', 0.05, 0, 3),
}
