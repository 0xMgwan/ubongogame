import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ApiError, api, getToken, setToken, setUnauthorizedHandler } from './api'
import { setHaptics, setSound } from './sound'
import type { FrameId, GameId, Item, ThemeId } from '../shared/catalog'

export * from '../shared/catalog'

export const GAMES: Record<GameId, { name: string; tag: string; desc: string; cls: string; color: string }> = {
  fumbua: { name: 'Fumbua', tag: 'Neno la Siku', desc: 'Fumbua neno la herufi 5 kwa majaribio 6', cls: 'g-fumbua', color: '#7ed6a8' },
  mafumbo: { name: 'Mafumbo', tag: 'Chemsha Bongo', desc: 'Jaza gridi kwa vidokezo vya Kiswahili', cls: 'g-mafumbo', color: '#f5b800' },
  windo: { name: 'Windo', tag: 'Msako wa Maneno', desc: 'Telezesha kidole, winda maneno kwa sekunde 90', cls: 'g-windo', color: '#8ec1ff' },
  pangua: { name: 'Pangua', tag: 'Panga Upya', desc: 'Zungusha gurudumu, unda maneno yote', cls: 'g-pangua', color: '#ff9fb6' },
}

/** The player as the server returns it (see server/players.ts › serialize). */
export type Me = {
  id: number; name: string; avatar: string; region: string
  coins: number; gems: number; xp: number; pro: boolean; proUntil: number
  inv: Record<Item, number>
  theme: ThemeId; frame: FrameId; ownedThemes: ThemeId[]; ownedFrames: FrameId[]
  streak: number; bestStreak: number; lastPlayDay: string | null
  lastBonusDay: string | null; chestDay: string | null; lastRewardAd: number
  fumbuaDist: number[]; panguaLevel: number; recoveryCode: string; duelWins: number; duelPlayed: number
  daily: Record<string, Partial<Record<GameId, number>>>
  stats: Record<GameId, { played: number; won: number; best: number }>
  weekly: number; today: string; dayIndex: number; week: string
}
export type Sponsor = { id?: number; slot?: string; brand: string; line: string; cta: string; link?: string | null; icon: string; color: string; image?: string | null; pdf?: string | null; house?: boolean }

const BLANK: Me = {
  id: 0, name: 'Mchezaji', avatar: 'simba', region: 'Dar es Salaam', coins: 0, gems: 0, xp: 0, pro: false, proUntil: 0,
  inv: { dokezo: 0, muda: 0, kinga: 0, bomu: 0 }, theme: 'karatasi', frame: 'none', ownedThemes: ['karatasi', 'usiku'], ownedFrames: ['none'],
  streak: 0, bestStreak: 0, lastPlayDay: null, lastBonusDay: null, chestDay: null, lastRewardAd: 0,
  fumbuaDist: [0, 0, 0, 0, 0, 0, 0], panguaLevel: 1, recoveryCode: '', duelWins: 0, duelPlayed: 0, daily: {},
  stats: { fumbua: { played: 0, won: 0, best: 0 }, mafumbo: { played: 0, won: 0, best: 0 }, windo: { played: 0, won: 0, best: 0 }, pangua: { played: 0, won: 0, best: 0 } },
  weekly: 0, today: '', dayIndex: 0, week: '',
}

type State = Me & {
  status: 'boot' | 'ready' | 'guest' | 'offline'
  payments: { enabled: boolean; provider: string | null; livemode: boolean }
  sponsors: Sponsor[]
  sound: boolean; haptics: boolean
  toast: { id: number; text: string; icon?: string } | null

  set: (p: Partial<State>) => void
  notify: (text: string, icon?: string) => void
  applyMe: (me: Me) => void
  boot: () => Promise<void>
  signIn: (token: string, me: Me) => void
  signOut: () => void
  updateMe: (fields: Partial<Pick<Me, 'name' | 'avatar' | 'region' | 'theme' | 'frame'>>) => Promise<void>
  fail: (e: unknown) => void
}

export const useStore = create<State>()(persist((set, get) => ({
  ...BLANK,
  status: 'boot',
  payments: { enabled: false, provider: null, livemode: false },
  sponsors: [],
  sound: true, haptics: true,
  toast: null,

  set: p => set(p),
  notify: (text, icon) => set({ toast: { id: Date.now(), text, icon } }),
  applyMe: me => set({ ...me }),
  fail: e => get().notify(e instanceof ApiError ? e.message : 'Hitilafu. Jaribu tena.', e instanceof ApiError && e.code === 'offline' ? 'ban' : 'close'),

  boot: async () => {
    api<{ sponsors: Sponsor[] }>('/sponsors').then(r => set({ sponsors: r.sponsors })).catch(() => {})
    if (!getToken()) { set({ status: 'guest' }); return }
    try {
      const r = await api<{ me: Me; payments: State['payments'] }>('/me')
      set({ ...r.me, payments: r.payments, status: 'ready' })
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) set({ status: 'guest' })
      else set({ status: get().id ? 'offline' : 'offline' })
    }
  },
  signIn: (token, me) => { setToken(token); set({ ...me, status: 'ready' }); api('/me').then((r: any) => set({ payments: r.payments })).catch(() => {}) },
  signOut: () => { setToken(null); set({ ...BLANK, status: 'guest' }) },
  updateMe: async fields => {
    const prev = get()
    set(fields as Partial<State>) // optimistic
    try { const r = await api<{ me: Me }>('/me', { method: 'PATCH', body: fields }); set({ ...r.me }) }
    catch (e) { set({ name: prev.name, avatar: prev.avatar, region: prev.region, theme: prev.theme, frame: prev.frame }); get().fail(e) }
  },
}), {
  name: 'ubongo-v3',
  // cache the last known player so the app paints instantly; the server stays the source of truth
  partialize: s => { const { toast, status, set: _s, ...rest } = s as any; return rest },
  onRehydrateStorage: () => s => { if (s) { setSound(s.sound); setHaptics(s.haptics) } },
}))

setUnauthorizedHandler(() => { setToken(null); useStore.setState({ status: 'guest' }) })
