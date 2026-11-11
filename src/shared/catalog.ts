// Single source of truth for prices, products and progression — imported by the app AND the server.
// The server is authoritative: it never trusts a price or reward sent by the client.

export type GameId = 'fumbua' | 'mafumbo' | 'windo' | 'pangua'
export const GAME_IDS: GameId[] = ['fumbua', 'mafumbo', 'windo', 'pangua']
export type Item = 'dokezo' | 'muda' | 'kinga' | 'bomu'
export type Cur = 'coins' | 'gems'

// Themes are palettes for the Bongo "paper & ink" look. `paper` = cards, `bg` = page, `ink` = text/lines.
export const THEMES = {
  karatasi: { name: 'Karatasi', price: 0, cur: 'coins' as Cur, pro: false, bg: '#f6f1e6', paper: '#fffdf8', ink: '#141414', soft: '#e9e2d3', accent: '#f5b800' },
  usiku: { name: 'Usiku', price: 0, cur: 'coins' as Cur, pro: false, bg: '#111110', paper: '#1b1a18', ink: '#f6f1e6', soft: '#2a2825', accent: '#f5b800' },
  machweo: { name: 'Machweo', price: 600, cur: 'coins' as Cur, pro: false, bg: '#ffe2c4', paper: '#fff6ec', ink: '#2a1408', soft: '#f6c9a0', accent: '#ff6b2c' },
  bahari: { name: 'Bahari', price: 600, cur: 'coins' as Cur, pro: false, bg: '#cfeee8', paper: '#f2fffc', ink: '#062a2a', soft: '#a6dcd2', accent: '#00a38a' },
  kanga: { name: 'Kanga', price: 40, cur: 'gems' as Cur, pro: false, bg: '#ffd6e4', paper: '#fff4f8', ink: '#2b0a1a', soft: '#f6b3cc', accent: '#e5452b' },
  dhahabu: { name: 'Dhahabu', price: 0, cur: 'gems' as Cur, pro: true, bg: '#141005', paper: '#211a08', ink: '#ffe9a8', soft: '#3a2e10', accent: '#f5b800' },
}
export type ThemeId = keyof typeof THEMES

export const FRAMES = {
  none: { name: 'Kawaida', price: 0, cur: 'coins' as Cur, pro: false },
  shaba: { name: 'Shaba', price: 300, cur: 'coins' as Cur, pro: false },
  fedha: { name: 'Fedha', price: 900, cur: 'coins' as Cur, pro: false },
  moto: { name: 'Moto', price: 60, cur: 'gems' as Cur, pro: false },
  kifalme: { name: 'Taji la Kifalme', price: 0, cur: 'gems' as Cur, pro: true },
}
export type FrameId = keyof typeof FRAMES

export const ITEMS: { id: Item; name: string; desc: string; icon: string; price: number; cur: Cur; qty: number }[] = [
  { id: 'dokezo', name: 'Dokezo ×5', desc: 'Fichua herufi moja', icon: 'bulb', price: 250, cur: 'coins', qty: 5 },
  { id: 'muda', name: 'Muda Zaidi ×3', desc: '+30s kwenye Windo', icon: 'clock', price: 150, cur: 'coins', qty: 3 },
  { id: 'bomu', name: 'Bomu la Neno ×3', desc: 'Fichua neno zima', icon: 'bomb', price: 12, cur: 'gems', qty: 3 },
  { id: 'kinga', name: 'Kinga ya Moto', desc: 'Linda mfululizo siku 1', icon: 'shield', price: 8, cur: 'gems', qty: 1 },
]
// Price in coins when a player uses an item they don't own (buy-and-use in one tap)
export const ITEM_SINGLE_PRICE: Record<Item, number> = { dokezo: 60, muda: 40, bomu: 150, kinga: 0 }

export const GEM_PACKS = [
  { id: 'gems_50', gems: 50, tzs: 1000, tag: '' },
  { id: 'gems_160', gems: 160, tzs: 2900, tag: 'MAARUFU' },
  { id: 'gems_500', gems: 500, tzs: 7500, tag: 'THAMANI BORA' },
  { id: 'gems_1200', gems: 1200, tzs: 15000, tag: '+20% BURE' },
]
export const COIN_PACKS = [{ id: 'coins_500', coins: 500, gems: 10 }, { id: 'coins_1500', coins: 1500, gems: 25 }, { id: 'coins_5000', coins: 5000, gems: 70 }]
export const PRO = { id: 'pro_month', tzs: 4900, days: 30, dailyHints: 3 }

export const AD_SLOTS = [
  { id: 'banner', name: 'Bango la Nyumbani', where: 'Juu ya michezo kwenye skrini kuu', reach: '≈ 12,000 /siku', price: 15000, emoji: '🏠' },
  { id: 'result', name: 'Mdhamini wa Matokeo', where: 'Kila mchezaji akimaliza mchezo', reach: '≈ 30,000 /siku', price: 25000, emoji: '🏆' },
  { id: 'reward', name: 'Video ya Zawadi', where: 'Wachezaji hutazama ili kupata sarafu', reach: '≈ 8,000 /siku', price: 35000, emoji: '🎬' },
  { id: 'league', name: 'Mdhamini wa Ligi', where: '"Ligi hii inaletwa kwenu na…" — juu ya ubao', reach: '≈ 9,000 /siku', price: 40000, emoji: '🥇' },
  { id: 'daily', name: 'Neno la Siku Limedhaminiwa', where: 'Jina lako kwenye changamoto ya kila siku', reach: 'Siku nzima, wote', price: 60000, emoji: '📅' },
]
export const adDiscount = (days: number) => (days >= 30 ? 0.25 : days >= 14 ? 0.15 : days >= 7 ? 0.1 : 0)
export const adPrice = (slot: string, days: number) => {
  const s = AD_SLOTS.find(x => x.id === slot)
  return s ? Math.round(s.price * days * (1 - adDiscount(days))) : 0
}
export const AD_ICONS = ['duka', 'kahawa', 'chakula', 'simu', 'gari', 'benki', 'muziki', 'mpira'] as const
export const AD_COLORS = ['#f5b800', '#e5452b', '#12805c', '#1f6feb', '#ff9fb6', '#141414']

export const REWARD_AD = { coins: 40, cooldownMs: 30_000, minWatchMs: 5_000, dailyCap: 20 }
export const DAILY_BONUS = (streak: number) => 50 + Math.min(streak, 10) * 10
export const CHEST = { coins: 150, gems: 3, xp: 50 }
export const LEAGUE_PRIZE_GEMS = 50
export const DUEL = { winCoins: 50, ghostWinCoins: 25, windoMs: 90_000, fumbuaMs: 180_000, countdownMs: 3_500, queueWaitMs: 15_000 }
export const CHALLENGE_BEAT_COINS = 30
export const STARTER = { coins: 250, gems: 10, inv: { dokezo: 3, muda: 1, kinga: 1, bomu: 1 } as Record<Item, number> }

export const AVATARS = ['simba', 'tembo', 'twiga', 'punda', 'chui', 'kifaru', 'kiboko', 'kasuku', 'kobe', 'tumbili'] as const
export const REGIONS = ['Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma', 'Zanzibar', 'Mbeya', 'Tanga', 'Moshi', 'Morogoro', 'Iringa', 'Mombasa', 'Nairobi', 'Kampala']

export const TITLES: [number, string][] = [
  [1, 'Mwanafunzi'], [3, 'Msomaji'], [6, 'Mjuzi'], [10, 'Mwalimu'], [15, 'Profesa'], [20, 'Gwiji'], [30, 'Mfalme wa Maneno'],
]
export const levelFromXp = (xp: number) => Math.floor(Math.sqrt(xp / 60)) + 1
export const xpForLevel = (lvl: number) => (lvl - 1) ** 2 * 60
export const titleFor = (lvl: number) => [...TITLES].reverse().find(t => lvl >= t[0])![1]

export const LEAGUES = [
  { name: 'Ligi ya Shaba', min: 0, color: '#d08a4f' },
  { name: 'Ligi ya Fedha', min: 1500, color: '#c9d3e6' },
  { name: 'Ligi ya Dhahabu', min: 4000, color: '#ffcb47' },
  { name: 'Ligi ya Almasi', min: 9000, color: '#7ee8ff' },
]
export const leagueFor = (weekly: number) => [...LEAGUES].reverse().find(l => weekly >= l.min)!
