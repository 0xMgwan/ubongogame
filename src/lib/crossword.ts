import { CLUES } from '../data/words.js'
import { Rng, shuffle } from './rng.js'

export type Placed = { word: string; clue: string; r: number; c: number; dir: 'A' | 'D'; num: number }
export type Crossword = { rows: number; cols: number; words: Placed[]; cells: (string | null)[][]; numbers: Record<string, number> }

const MAX = 11

export function makeCrossword(rng: Rng, target = 9): Crossword {
  let best: Crossword | null = null
  for (let attempt = 0; attempt < 12; attempt++) {
    const cw = attemptBuild(rng, target)
    if (!best || cw.words.length > best.words.length) best = cw
    if (best.words.length >= target) break
  }
  return best!
}

function attemptBuild(rng: Rng, target: number): Crossword {
  const pool = shuffle(Object.keys(CLUES).filter(w => w.length >= 3 && w.length <= 8), rng)
  const grid = new Map<string, string>()
  const placed: Omit<Placed, 'num'>[] = []
  const key = (r: number, c: number) => `${r},${c}`
  let minR = 0, maxR = 0, minC = 0, maxC = 0

  const first = pool.find(w => w.length >= 6) || pool[0]
  put(first, 0, 0, 'A')

  function put(word: string, r: number, c: number, dir: 'A' | 'D') {
    for (let i = 0; i < word.length; i++) {
      const rr = dir === 'D' ? r + i : r, cc = dir === 'A' ? c + i : c
      grid.set(key(rr, cc), word[i])
      minR = Math.min(minR, rr); maxR = Math.max(maxR, rr); minC = Math.min(minC, cc); maxC = Math.max(maxC, cc)
    }
    placed.push({ word, clue: CLUES[word], r, c, dir })
  }

  function score(word: string, r: number, c: number, dir: 'A' | 'D') {
    const dr = dir === 'D' ? 1 : 0, dc = dir === 'A' ? 1 : 0
    // ends must be free
    if (grid.has(key(r - dr, c - dc)) || grid.has(key(r + dr * word.length, c + dc * word.length))) return -1
    let cross = 0
    for (let i = 0; i < word.length; i++) {
      const rr = r + dr * i, cc = c + dc * i
      const g = grid.get(key(rr, cc))
      if (g) { if (g !== word[i]) return -1; cross++; continue }
      // side neighbours must be empty when not crossing
      if (grid.has(key(rr + dc, cc + dr)) || grid.has(key(rr - dc, cc - dr))) return -1
    }
    if (cross === 0 || cross === word.length) return -1
    const nMinR = Math.min(minR, r), nMaxR = Math.max(maxR, r + dr * (word.length - 1))
    const nMinC = Math.min(minC, c), nMaxC = Math.max(maxC, c + dc * (word.length - 1))
    if (nMaxR - nMinR + 1 > MAX || nMaxC - nMinC + 1 > MAX) return -1
    const area = (nMaxR - nMinR + 1) * (nMaxC - nMinC + 1)
    return cross * 100 - area * 0.5 + rng() * 10
  }

  for (const word of pool) {
    if (placed.length >= target) break
    if (placed.some(p => p.word === word)) continue
    let bestS = -1, bestP: [number, number, 'A' | 'D'] | null = null
    for (const p of placed) {
      for (let i = 0; i < p.word.length; i++) {
        for (let j = 0; j < word.length; j++) {
          if (p.word[i] !== word[j]) continue
          const dir = p.dir === 'A' ? 'D' : 'A'
          const pr = p.dir === 'D' ? p.r + i : p.r, pc = p.dir === 'A' ? p.c + i : p.c
          const r = dir === 'D' ? pr - j : pr, c = dir === 'A' ? pc - j : pc
          const s = score(word, r, c, dir)
          if (s > bestS) { bestS = s; bestP = [r, c, dir] }
        }
      }
    }
    if (bestP) put(word, ...bestP)
  }

  const rows = maxR - minR + 1, cols = maxC - minC + 1
  const cells: (string | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null))
  grid.forEach((v, k) => { const [r, c] = k.split(',').map(Number); cells[r - minR][c - minC] = v })
  const norm = placed.map(p => ({ ...p, r: p.r - minR, c: p.c - minC }))
  // number like a real crossword: reading order
  const starts = Array.from(new Set(norm.map(p => `${p.r},${p.c}`)))
    .sort((a, b) => { const [ar, ac] = a.split(',').map(Number), [br, bc] = b.split(',').map(Number); return ar - br || ac - bc })
  const numbers: Record<string, number> = {}
  starts.forEach((s, i) => (numbers[s] = i + 1))
  const words: Placed[] = norm.map(p => ({ ...p, num: numbers[`${p.r},${p.c}`] }))
    .sort((a, b) => a.dir.localeCompare(b.dir) || a.num - b.num)
  return { rows, cols, words, cells, numbers }
}
