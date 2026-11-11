// Scoring + rewards. The server computes these; the app only displays what the server returns.
export const WINDO_TIME = 90
export const WINDO_EXTRA = 30
export const windoPts = (len: number) => [0, 0, 0, 100, 400, 800, 1400, 1800, 2200][Math.min(len, 8)]

export const fumbuaScore = (won: boolean, tries: number, daily: boolean) => (won ? (7 - tries) * 100 + (daily ? 50 : 0) : 10)
export const fumbuaReward = (won: boolean, tries: number) => (won ? { coins: 20 + (7 - tries) * 10, xp: 40 } : { coins: 5, xp: 10 })

export const mafumboScore = (secs: number, helps: number) => Math.max(150, 1200 - secs * 2 - helps * 90)
export const mafumboReward = (score: number) => ({ coins: 40 + Math.round(score / 30), xp: 60 })

export const windoReward = (score: number, words: number) => ({ coins: 10 + Math.round(score / 60), xp: 20 + words * 4 })

export const panguaScore = (targets: string[], level: number, helps: number) =>
  Math.max(50, targets.reduce((a, x) => a + x.length * 40, 0) + level * 50 - helps * 40)
export const panguaReward = (targets: number) => ({ coins: 25 + targets * 3, xp: 35 })
