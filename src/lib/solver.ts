import { LEXICON } from '../data/words.js'

// ---- Trie for grid search ----
type Node = { c: Record<string, Node>; w?: string }
let ROOT: Node | null = null
function trie() {
  if (ROOT) return ROOT
  ROOT = { c: {} }
  for (const w of LEXICON) {
    let n = ROOT
    for (const ch of w) n = n.c[ch] ??= { c: {} }
    n.w = w
  }
  return ROOT
}

export function solveGrid(grid: string[], size: number, min = 3): Map<string, number[]> {
  const found = new Map<string, number[]>()
  const root = trie()
  const seen = new Array(grid.length).fill(false)
  const path: number[] = []
  const dfs = (i: number, node: Node) => {
    const nx = node.c[grid[i]]; if (!nx) return
    seen[i] = true; path.push(i)
    if (nx.w && nx.w.length >= min && !found.has(nx.w)) found.set(nx.w, path.slice())
    const r = Math.floor(i / size), c = i % size
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue
      const rr = r + dr, cc = c + dc
      if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue
      const j = rr * size + cc
      if (!seen[j]) dfs(j, nx)
    }
    seen[i] = false; path.pop()
  }
  for (let i = 0; i < grid.length; i++) dfs(i, root)
  return found
}

// ---- Anagram helpers ----
export function counts(s: string) {
  const m: Record<string, number> = {}
  for (const ch of s) m[ch] = (m[ch] || 0) + 1
  return m
}
export function canForm(word: string, pool: Record<string, number>) {
  const m = counts(word)
  return Object.keys(m).every(k => (pool[k] || 0) >= m[k])
}
export function subWords(base: string, min = 3) {
  const pool = counts(base)
  return LEXICON.filter(w => w.length >= min && w.length <= base.length && canForm(w, pool))
    .sort((a, b) => a.length - b.length || a.localeCompare(b))
}

let ANAGRAM_BASES: string[] | null = null
export function anagramBases() {
  if (ANAGRAM_BASES) return ANAGRAM_BASES
  ANAGRAM_BASES = LEXICON.filter(w => w.length >= 5 && w.length <= 7)
    .filter(w => { const n = subWords(w).length; return n >= 4 && n <= 14 })
  return ANAGRAM_BASES
}
