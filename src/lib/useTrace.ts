import { useRef, useState } from 'react'

// Drag-to-select across tiles. `centers` are tile centers in px relative to the board element.
export function useTrace(opts: {
  centers: () => { x: number; y: number }[]
  radius: () => number
  canAdd: (path: number[], i: number) => boolean
  onAdd?: (path: number[]) => void
  onEnd: (path: number[]) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [path, setPath] = useState<number[]>([])
  const pathRef = useRef<number[]>([])
  const down = useRef(false)

  const hit = (e: React.PointerEvent) => {
    const el = ref.current!; const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left, y = e.clientY - rect.top
    const cs = opts.centers(), r = opts.radius()
    for (let i = 0; i < cs.length; i++) if (Math.hypot(cs[i].x - x, cs[i].y - y) < r) return i
    return -1
  }
  const update = (p: number[]) => { pathRef.current = p; setPath(p); opts.onAdd?.(p) }
  const consider = (i: number) => {
    if (i < 0) return
    const p = pathRef.current
    if (p.length >= 2 && p[p.length - 2] === i) return update(p.slice(0, -1)) // backtrack
    if (p.includes(i)) return
    if (p.length && !opts.canAdd(p, i)) return
    update([...p, i])
  }
  const handlers = {
    onPointerDown: (e: React.PointerEvent) => { (e.target as Element).releasePointerCapture?.(e.pointerId); down.current = true; pathRef.current = []; consider(hit(e)) },
    onPointerMove: (e: React.PointerEvent) => { if (down.current) consider(hit(e)) },
    onPointerUp: () => { if (!down.current) return; down.current = false; const p = pathRef.current; pathRef.current = []; setPath([]); opts.onEnd(p) },
    onPointerLeave: () => { if (!down.current) return; down.current = false; const p = pathRef.current; pathRef.current = []; setPath([]); opts.onEnd(p) },
  }
  return { ref, path, handlers }
}
