// Thin client for the Ubongo API. In dev Vite proxies /api → :8790; in production the server serves the app.
const TOKEN_KEY = 'ubongo-token'
const BASE = (import.meta as any).env?.VITE_API_URL ?? ''

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
export const setToken = (t: string | null) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* private mode */ } }

export class ApiError extends Error {
  constructor(public status: number, msg: string, public code?: string) { super(msg) }
}
let onUnauthorized: () => void = () => {}
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn)

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const t = getToken()
  let res: Response
  try {
    res = await fetch(BASE + '/api' + path, {
      method: opts.method ?? (opts.body ? 'POST' : 'GET'),
      headers: { ...(opts.body ? { 'content-type': 'application/json' } : {}), ...(t ? { authorization: `Bearer ${t}` } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Hakuna mtandao. Angalia intaneti yako.', 'offline')
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401) onUnauthorized()
    throw new ApiError(res.status, body.error || 'Hitilafu. Jaribu tena.', body.code)
  }
  return body as T
}
