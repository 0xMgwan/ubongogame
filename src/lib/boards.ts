// Deterministic puzzle builders shared by app + server (no DOM).
import { FUMBUA_ANSWERS, LETTER_WEIGHTS, LEXICON } from '../data/words.js'
import { Rng, rngFor, shuffle, weighted } from './rng.js'
import { anagramBases, solveGrid, subWords } from './solver.js'

export const WINDO_N = 4

function plant(grid: (string | null)[], word: string, rng: Rng) {
  const N = WINDO_N
  for (let attempt = 0; attempt < 40; attempt++) {
    const path: number[] = []
    let i = Math.floor(rng() * N * N)
    let ok = true
    for (let k = 0; k < word.length; k++) {
      if (k > 0) {
        const r = Math.floor(i / N), c = i % N
        const opts = shuffle([-1, 0, 1].flatMap(dr => [-1, 0, 1].map(dc => [dr, dc])), rng)
          .map(([dr, dc]) => [r + dr, c + dc]).filter(([rr, cc]) => rr >= 0 && cc >= 0 && rr < N && cc < N)
          .map(([rr, cc]) => rr * N + cc).filter(j => !path.includes(j) && (grid[j] === null || grid[j] === word[k]))
        if (!opts.length) { ok = false; break }
        i = opts[0]
      } else if (grid[i] !== null && grid[i] !== word[0]) { ok = false; break }
      path.push(i)
    }
    if (ok) { path.forEach((j, k) => (grid[j] = word[k])); return true }
  }
  return false
}

export function makeWindoBoard(seed: string) {
  const N = WINDO_N
  const rng = rngFor(seed)
  let best: { grid: string[]; words: Map<string, number[]> } | null = null
  for (let t = 0; t < 30; t++) {
    const g: (string | null)[] = Array(N * N).fill(null)
    const candidates = shuffle(LEXICON.filter(w => w.length >= 4 && w.length <= 7), rng)
    let planted = 0
    for (const w of candidates) { if (planted >= 3) break; if (plant(g, w, rng)) planted++ }
    const grid = g.map(x => x ?? weighted(LETTER_WEIGHTS, rng))
    const words = solveGrid(grid, N)
    if (!best || words.size > best.words.size) best = { grid, words }
    if (words.size >= 18) break
  }
  return best!
}

export function panguaBase(level: number) {
  const b = anagramBases()
  // fixed global order so every player climbs the same ladder
  const order = shuffle(b, rngFor('pangua-ladder-v1'))
  return order[(level - 1) % order.length]
}
export const panguaTargets = (base: string) => subWords(base)

export const fumbuaDailyAnswer = (dayIdx: number) => FUMBUA_ANSWERS[(dayIdx * 7919 + 13) % FUMBUA_ANSWERS.length]
