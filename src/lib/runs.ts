import { api } from './api'
import { Me, useStore } from './store'
import type { GameId, Item } from '../shared/catalog'

export type RunView = {
  id: string; game: GameId; mode: 'daily' | 'practice' | 'level' | 'challenge' | 'duel'; day: string; dayIndex: number; startedAt: number
  done: boolean; won: boolean; helps: number; challenge: string | null; duel: string | null
  seed?: string; extra?: number; level?: number; found?: string[]
  guesses?: { word: string; marks: ('correct' | 'present' | 'absent')[] }[]
  hints?: Record<number, string>; answer?: string
}
export type ServerResult = {
  runId: string; won: boolean; score: number; coins: number; xp: number; doubled: boolean
  words?: string[] | number; total?: number; missed?: string[]; late?: boolean; secs?: number; level?: number; answer?: string
  challenge?: { beat: boolean; creatorScore: number; rank: number; plays: number; bonus: number }
}

const s = () => useStore.getState()

export async function startRun(game: GameId, mode?: 'daily') {
  return api<{ run: RunView; result: ServerResult | null }>('/runs', { body: { game, mode } })
}

/** Use (or buy-and-use) a power-up inside a run. Returns null if it failed (a toast already explains why). */
export async function useRunItem(runId: string, item: Item) {
  try {
    const r = await api<{ paidWith: 'item' | 'coins'; reveal?: { index: number; letter: string }; run: RunView; me: Me }>(`/runs/${runId}/item`, { body: { item } })
    s().applyMe(r.me)
    return r
  } catch (e: any) {
    s().fail(e)
    if (e?.code === 'insufficient_funds') s().notify('Sarafu hazitoshi — tembelea Duka', 'bag')
    return null
  }
}

export async function finishRun(runId: string, body: Record<string, unknown>) {
  const r = await api<{ result: ServerResult; me: Me }>(`/runs/${runId}/finish`, { body })
  s().applyMe(r.me)
  return r.result
}
