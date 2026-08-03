// Typed client for the Go account service (`nextendo-account`), reached via
// `/api/*` (same origin). Used only from Server Components / Route Handlers /
// Server Actions; never import from a client component.
import { getEnv } from '@/lib/env'

type Counts = Record<string, number>

export type OnlineCounts = {
  counts: Counts
}

export type Account = {
  id?: string
  pid?: string
  username?: string
  email?: string
  friend_code?: string
  email_verified?: boolean
  is_guest?: boolean
  [key: string]: unknown
}

export type Profile = {
  name?: string
  avatar?: string
  color?: string
  image?: string
  [key: string]: unknown
}

export type SiteConfig = {
  registration_open?: boolean
  [key: string]: unknown
}

async function apiFetch(
  path: string,
  init?: Omit<RequestInit, 'next'> & {
    next?: { revalidate?: number; tags?: string[] }
  },
): Promise<Response | null> {
  const baseUrl = getEnv().NEXTENDO_ACCOUNT_BASE_URL
  const url = baseUrl ? `${baseUrl}${path}` : path
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
      // biome-ignore lint/suspicious/noExplicitAny: Next extends RequestInit with `next`
      next: init?.next as any,
    })
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchOnlineCounts(): Promise<OnlineCounts | null> {
  const res = await apiFetch('/api/online-counts', {
    next: { revalidate: 15 },
  })
  if (!res || !res.ok) return null
  try {
    const data = (await res.json()) as { counts?: Counts }
    return { counts: data.counts ?? {} }
  } catch {
    return null
  }
}

export type FetchOptions = Parameters<typeof apiFetch>[1]

// -----------------------------------------------------------------------------
// Auth endpoints (use only from Server Actions / Route Handlers)
// -----------------------------------------------------------------------------

export type AuthResult<T> = { ok: true; data: T } | { ok: false; error: string }

type PostInit = Omit<RequestInit, 'method' | 'body' | 'headers' | 'next'> & {
  headers?: Record<string, string>
  next?: { revalidate?: number; tags?: string[] }
}

async function postJson<T>(path: string, body: unknown, init?: PostInit): Promise<AuthResult<T>> {
  const res = await apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res) return { ok: false, error: 'network' }
  let data: T & { error?: string } = {} as T & { error?: string }
  try {
    data = (await res.json()) as T & { error?: string }
  } catch {
    // Empty body is fine for some endpoints.
  }
  if (!res.ok) return { ok: false, error: data.error ?? `http_${res.status}` }
  return { ok: true, data }
}

async function putJson<T>(path: string, body: unknown, init?: PostInit): Promise<AuthResult<T>> {
  const res = await apiFetch(path, {
    method: 'PUT',
    body: JSON.stringify(body),
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res) return { ok: false, error: 'network' }
  let data: T & { error?: string } = {} as T & { error?: string }
  try {
    data = (await res.json()) as T & { error?: string }
  } catch {
    // Empty body is fine for some endpoints.
  }
  if (!res.ok) return { ok: false, error: data.error ?? `http_${res.status}` }
  return { ok: true, data }
}

export type RegisterPayload = {
  username: string
  email: string
  password: string
}

export async function registerAccount(
  payload: RegisterPayload,
  opts?: { turnstile?: string },
): Promise<AuthResult<{ account?: Account; nex_token?: string }>> {
  return postJson('/api/register', payload, {
    headers: opts?.turnstile ? { 'Cf-Turnstile-Response': opts.turnstile } : undefined,
  })
}

export async function loginAccount(
  payload: { login: string; password: string },
  opts?: { turnstile?: string },
): Promise<AuthResult<{ account?: Account; nex_token?: string }>> {
  return postJson('/api/login', payload, {
    headers: opts?.turnstile ? { 'Cf-Turnstile-Response': opts.turnstile } : undefined,
  })
}

export async function forgotPassword(payload: {
  email: string
}): Promise<AuthResult<null>> {
  return postJson('/api/forgot', payload)
}

export async function resetPassword(payload: {
  token: string
  password: string
}): Promise<AuthResult<null>> {
  return postJson('/api/reset', payload)
}

export async function verifyEmail(token: string): Promise<AuthResult<{ email?: string }>> {
  return apiFetch(`/api/verify?token=${encodeURIComponent(token)}`).then(async (res) => {
    if (!res) return { ok: false as const, error: 'network' }
    let data: { email?: string; error?: string } = {}
    try {
      data = (await res.json()) as { email?: string; error?: string }
    } catch {
      // Empty body is fine.
    }
    if (!res.ok) return { ok: false as const, error: data.error ?? `http_${res.status}` }
    return { ok: true as const, data }
  })
}

export async function resendVerification(): Promise<AuthResult<null>> {
  return postJson('/api/resend-verification', {})
}

export async function fetchMe(): Promise<Account | null> {
  const res = await apiFetch('/api/me')
  if (!res || !res.ok) return null
  try {
    const data = (await res.json()) as { account?: Account }
    return data.account ?? null
  } catch {
    return null
  }
}

export async function fetchSiteConfig(): Promise<SiteConfig | null> {
  const res = await apiFetch('/api/site-config', {
    next: { revalidate: 60 },
  })
  if (!res || !res.ok) return null
  try {
    const data = (await res.json()) as SiteConfig
    return data
  } catch {
    return null
  }
}

// -----------------------------------------------------------------------------
// Account endpoints (dashboard `/compte`) — call from RSC, route handlers,
// or client components (cookies carry the auth).
// -----------------------------------------------------------------------------

export type FriendPresence = {
  status?: number
  app_id?: string
  app_detail?: string
  [key: string]: unknown
}

export type Friend = {
  pid?: string
  username?: string
  name?: string
  color?: string
  avatar?: string
  image?: string
  friend_code?: string
  favorite?: boolean
  created_at?: string
  presence?: FriendPresence
  [key: string]: unknown
}

export type HistoryEntry = {
  title_id?: string
  name?: string
  seconds?: number
  last_played?: string
  icon?: string
  [key: string]: unknown
}

export type GameInfoLink = { type?: string; url?: string }

export type GameInfo = {
  title_id?: string
  name?: string
  description?: string
  accent?: string
  hero?: string
  cover?: string
  screenshots?: string[]
  genres?: string[]
  publisher?: string
  developer?: string
  release_date?: string
  platforms?: string[]
  links?: GameInfoLink[]
  metacritic?: number
  [key: string]: unknown
}

export async function fetchProfile(): Promise<Profile | null> {
  const res = await apiFetch('/api/profile', {
    next: { revalidate: 30 },
  })
  if (!res || !res.ok) return null
  try {
    return (await res.json()) as Profile
  } catch {
    return null
  }
}

export async function putProfile(profile: Profile): Promise<AuthResult<Profile>> {
  return putJson('/api/profile', profile)
}

export async function fetchFriends(): Promise<{ friends: Friend[]; requests: Friend[] } | null> {
  const res = await apiFetch('/api/friends', {
    next: { revalidate: 15 },
  })
  if (!res || !res.ok) return null
  try {
    const data = (await res.json()) as { friends?: Friend[]; requests?: Friend[] }
    return { friends: data.friends ?? [], requests: data.requests ?? [] }
  } catch {
    return null
  }
}

export async function addFriend(friend_code: string): Promise<AuthResult<unknown>> {
  return postJson('/api/friends', { friend_code })
}

export async function acceptFriend(pid: string | number): Promise<AuthResult<unknown>> {
  return postJson('/api/friends/accept', { pid })
}

export async function declineFriend(pid: string | number): Promise<AuthResult<unknown>> {
  return postJson('/api/friends/decline', { pid })
}

export async function removeFriend(pid: string | number): Promise<AuthResult<unknown>> {
  return postJson('/api/friends/remove', { pid })
}

export async function blockFriend(pid: string | number): Promise<AuthResult<unknown>> {
  return postJson('/api/friends/block', { pid })
}

export async function setFavorite(pid: string, on: boolean): Promise<AuthResult<unknown>> {
  return postJson('/api/friends/favorite', { pid, on })
}

export async function fetchFriendHistory(pid: string): Promise<{ history: HistoryEntry[] } | null> {
  const res = await apiFetch(`/api/friends/history?pid=${encodeURIComponent(pid)}`)
  if (!res || !res.ok) return null
  try {
    const data = (await res.json()) as { history?: HistoryEntry[] }
    return { history: data.history ?? [] }
  } catch {
    return null
  }
}

export async function fetchHistory(): Promise<{ history: HistoryEntry[] } | null> {
  const res = await apiFetch('/api/history', {
    next: { revalidate: 30 },
  })
  if (!res || !res.ok) return null
  try {
    const data = (await res.json()) as { history?: HistoryEntry[] }
    return { history: data.history ?? [] }
  } catch {
    return null
  }
}

export async function fetchGameInfo(titleId: string, name: string): Promise<GameInfo | null> {
  const qs = new URLSearchParams({
    title_id: titleId || '',
    name: name || '',
  })
  const res = await apiFetch(`/api/gameinfo?${qs.toString()}`)
  if (!res || !res.ok) return null
  try {
    return (await res.json()) as GameInfo
  } catch {
    return null
  }
}

export async function usernameAvailable(username: string): Promise<boolean | null> {
  const res = await apiFetch(`/api/username-available?username=${encodeURIComponent(username)}`)
  if (!res || !res.ok) return null
  try {
    const data = (await res.json()) as { available?: boolean }
    return typeof data.available === 'boolean' ? data.available : null
  } catch {
    return null
  }
}

export async function setUsername(username: string): Promise<AuthResult<unknown>> {
  return putJson('/api/username', { username })
}

export async function changeEmail(email: string, password: string): Promise<AuthResult<null>> {
  return postJson('/api/email', { email, password })
}

export async function deleteAccount(password: string): Promise<AuthResult<null>> {
  return postJson('/api/delete-account', { password })
}

// -----------------------------------------------------------------------------
// Sessions (Phase 5) — typed here so `/compte` can link to `/sessions`.
// -----------------------------------------------------------------------------

export type Session = {
  id?: string
  kind?: string
  current?: boolean
  in_use?: boolean
  created_at?: string
  last_seen?: string
  ip?: string
  user_agent?: string
  [key: string]: unknown
}

export async function fetchSessions(): Promise<{ sessions: Session[] } | null> {
  const res = await apiFetch('/api/sessions')
  if (!res || !res.ok) return null
  try {
    const data = (await res.json()) as { sessions?: Session[] }
    return { sessions: data.sessions ?? [] }
  } catch {
    return null
  }
}

export async function revokeSession(id: string): Promise<AuthResult<unknown>> {
  return postJson('/api/sessions/revoke', { id })
}

export async function revokeAllSessions(): Promise<AuthResult<unknown>> {
  return postJson('/api/sessions/revoke-all', {})
}
