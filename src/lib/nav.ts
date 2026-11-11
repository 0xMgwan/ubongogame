import { create } from 'zustand'
import type { GameId, Sponsor } from './store'
import type { RunView } from './runs'

export { AD_SLOTS } from '../shared/catalog'

export type Tab = 'home' | 'vita' | 'ligi' | 'duka' | 'mimi'
type Nav = {
  tab: Tab
  game: GameId | null
  run: RunView | null          // a run handed to the game (e.g. a challenge)
  challenge: string | null     // challenge code being viewed (/c/:code)
  advertise: boolean
  shopFocus: string | null
  go: (t: Tab, focus?: string) => void
  play: (g: GameId | null, run?: RunView | null) => void
  openChallenge: (code: string | null) => void
  openAdvertise: (v: boolean) => void
}
export const useNav = create<Nav>(set => ({
  tab: 'home', game: null, run: null, challenge: null, advertise: false, shopFocus: null,
  go: (tab, focus) => set({ tab, game: null, run: null, advertise: false, shopFocus: focus ?? null }),
  play: (game, run = null) => set({ game, run }),
  openChallenge: challenge => set({ challenge }),
  openAdvertise: advertise => set({ advertise }),
}))

// House ad fills every slot until a paid campaign is live there.
export const HOUSE: Sponsor = { brand: 'Tangaza Hapa', line: 'Fikia maelfu ya wachezaji kila siku', cta: 'Weka tangazo', icon: 'megaphone', color: '#f5b800', house: true }
