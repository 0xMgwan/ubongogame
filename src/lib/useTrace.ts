import { useEffect, useRef, useState } from 'react'

/**
 * Drag-to-select across tiles (Windo grid, Pangua wheel).
 *  - Phones: native touch events (non-passive, so the page can't scroll mid-swipe). iOS Safari pins a
 *    touch's pointer events to the first tile it touched, so pointer events alone are unreliable there.
 *  - Mouse/pen: pointer events with capture on the board.
 *  - Hit-testing uses the tiles' real on-screen boxes, measured when the gesture starts.
 */
export function useTrace(opts: {
  item: string                          // CSS selector of the tiles inside the board, in index order
  radius?: number                       // hit radius as a fraction of the tile size
  canAdd: (path: number[], i: number) => boolean
  onAdd?: (path: number[]) => void
  onEnd: (path: number[]) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [path, setPath] = useState<number[]>([])
  const o = useRef(opts); o.current = opts
  const geo = useRef<{ board: DOMRect; tiles: DOMRect[] }>({ board: new DOMRect(), tiles: [] })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let active = false
    let cur: number[] = []
    const measure = () => {
      // tiles may say which slot they are (data-i) when their DOM order differs (e.g. Pangua after a shuffle)
      const tiles: DOMRect[] = []
      el.querySelectorAll<HTMLElement>(o.current.item).forEach((n, k) => { tiles[n.dataset.i !== undefined ? Number(n.dataset.i) : k] = n.getBoundingClientRect() })
      geo.current = { board: el.getBoundingClientRect(), tiles }
    }
    const hit = (x: number, y: number) => {
      const f = o.current.radius ?? 0.45
      const t = geo.current.tiles
      for (let i = 0; i < t.length; i++) {
        const r = t[i]
        if (r && Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y) < Math.min(r.width, r.height) * f) return i
      }
      return -1
    }
    const update = (p: number[]) => { cur = p; setPath(p); o.current.onAdd?.(p) }
    const consider = (i: number) => {
      if (i < 0) return
      if (cur.length >= 2 && cur[cur.length - 2] === i) return update(cur.slice(0, -1)) // slide back = undo
      if (cur.includes(i)) return
      if (cur.length && !o.current.canAdd(cur, i)) return
      update([...cur, i])
    }
    const start = (x: number, y: number) => { active = true; cur = []; measure(); consider(hit(x, y)) }
    const move = (x: number, y: number) => { if (active) consider(hit(x, y)) }
    const end = () => {
      if (!active) return
      active = false
      const p = cur; cur = []; setPath([])
      o.current.onEnd(p)
    }
    const onButton = (e: Event) => !!(e.target as Element | null)?.closest?.('button')

    // ---- touch (phones) ----
    const ts = (e: TouchEvent) => {
      if (onButton(e) || e.touches.length > 1) return
      e.preventDefault()
      start(e.touches[0].clientX, e.touches[0].clientY)
    }
    const tm = (e: TouchEvent) => { if (!active) return; e.preventDefault(); const t = e.touches[0]; if (t) move(t.clientX, t.clientY) }
    const te = () => end()

    // ---- mouse / pen ----
    const pd = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.button !== 0 || onButton(e)) return
      try { el.setPointerCapture(e.pointerId) } catch { /* not supported */ }
      start(e.clientX, e.clientY)
    }
    const pm = (e: PointerEvent) => { if (e.pointerType !== 'touch') move(e.clientX, e.clientY) }
    const pu = (e: PointerEvent) => { if (e.pointerType !== 'touch') end() }

    el.addEventListener('touchstart', ts, { passive: false })
    el.addEventListener('touchmove', tm, { passive: false })
    el.addEventListener('touchend', te)
    el.addEventListener('touchcancel', te)
    el.addEventListener('pointerdown', pd)
    el.addEventListener('pointermove', pm)
    el.addEventListener('pointerup', pu)
    el.addEventListener('pointercancel', pu)
    return () => {
      el.removeEventListener('touchstart', ts); el.removeEventListener('touchmove', tm)
      el.removeEventListener('touchend', te); el.removeEventListener('touchcancel', te)
      el.removeEventListener('pointerdown', pd); el.removeEventListener('pointermove', pm)
      el.removeEventListener('pointerup', pu); el.removeEventListener('pointercancel', pu)
    }
  }, [])

  /** Centres of the given tiles relative to the board (for drawing the trail line). */
  const pointsFor = (p: number[]) => {
    const { board, tiles } = geo.current
    return p.filter(i => tiles[i]).map(i => ({ x: tiles[i].left - board.left + tiles[i].width / 2, y: tiles[i].top - board.top + tiles[i].height / 2 }))
  }
  return { ref, path, pointsFor }
}
