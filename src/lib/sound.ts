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
export function buzz(ms: number | number[] = 8) { if (haptics && navigator.vibrate) navigator.vibrate(ms) }

export const sfx = {
  tap: () => { tone(620, 0.05, 'triangle', 0.07); buzz(5) },
  key: () => { tone(420, 0.04, 'triangle', 0.05) },
  chain: (n: number) => { tone(440 * Math.pow(1.0595, Math.min(n, 18) * 2), 0.07, 'sine', 0.09); buzz(4) },
  pop: () => { tone(880, 0.06, 'square', 0.04, 0, 1.6) },
  flip: (i: number) => tone(300 + i * 60, 0.09, 'triangle', 0.06),
  good: () => { [523, 659, 784].forEach((f, i) => tone(f, 0.16, 'sine', 0.1, i * 0.06)); buzz([10, 30, 10]) },
  great: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.1, i * 0.07)); buzz([15, 40, 15]) },
  bad: () => { tone(180, 0.18, 'sawtooth', 0.06, 0, 0.6); buzz([30, 40, 30]) },
  coin: () => { tone(988, 0.07, 'square', 0.05); tone(1319, 0.18, 'square', 0.05, 0.07) },
  win: () => { [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.3, 'triangle', 0.09, i * 0.09)); buzz([20, 50, 20, 50, 60]) },
  whoosh: () => tone(200, 0.25, 'sine', 0.05, 0, 3),
}
