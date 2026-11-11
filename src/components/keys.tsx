// Swahili on-screen keyboard rows (Swahili has no Q or X; C only appears in "ch").
export const KEY_ROWS = ['wertyuiop', 'asdfghjkl', 'zcvbnm']

import { useEffect, useRef, useState } from 'react'
import { PowerBtn } from './ui'

const SENTINEL = '​' // a zero-width space keeps a character to delete, so Backspace always reports
const isTouch = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

/**
 * "Use my phone's keyboard": a hidden text field that opens the native keyboard and feeds
 * letters / delete / enter to the game. Physical keyboards already work everywhere.
 */
export function PhoneKeyboard({ onKey }: { onKey: (k: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [touch, setTouch] = useState(false)
  const keyRef = useRef(onKey); keyRef.current = onKey
  useEffect(() => { setTouch(isTouch()) }, [])
  const reset = () => { const el = ref.current; if (el) { el.value = SENTINEL; el.setSelectionRange(1, 1) } }
  if (!touch) return null
  return (
    <>
      <PowerBtn icon="keyboard" label="Kibodi ya simu" onClick={() => { reset(); ref.current?.focus() }} />
      <input ref={ref} defaultValue={SENTINEL} aria-label="Andika kwa kibodi ya simu"
        autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} inputMode="text" enterKeyHint="go"
        style={{ position: 'fixed', left: 0, bottom: 0, width: 1, height: 1, opacity: 0, fontSize: 16, border: 0, padding: 0, pointerEvents: 'none' }}
        onInput={e => {
          const v = e.currentTarget.value
          if (!v.includes(SENTINEL)) keyRef.current('del')
          for (const ch of v.replace(SENTINEL, '').toLowerCase()) if (/[a-z]/.test(ch)) keyRef.current(ch)
          reset()
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); keyRef.current('enter') }
          e.stopPropagation() // the game's own window listener must not see these twice
        }} />
    </>
  )
}
