// Typed client for the Go account service (`nextendo-account`), reached via
// `/api/*` (same origin). Used only from Server Components / Route Handlers /
// Server Actions; never import from a client component.
import { getEnv } from '@/lib/env'
import {
  type SavesResponse,
  normalizeSavesResponse,
  saveLocaleSchema,
  titleIdSchema,
} from '@/lib/saves'
import { z } from 'zod'

type Counts = Record<string, number>

export type ApiRequestOptions = {
  cookie?: string
}

export type OnlineCounts = {
  counts: Counts
}

export type Account = {
  id?: string | number
  pid?: string
  username?: string
  email?: string
  country?: string
  friend_code?: string
  email_verified?: boolean
  is_guest?: boolean
  discord?: string
  discord_linked_at?: string
  [key: string]: unknown
}

const accountSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    pid: z.string().optional(),
    username: z.string().optional(),
    email: z.string().optional(),
    country: z.string().optional(),
    friend_code: z.string().optional(),
    email_verified: z.boolean().optional(),
    is_guest: z.boolean().optional(),
    discord: z.string().optional(),
    discord_linked_at: z.string().optional(),
  })
  .passthrough()

export function isCloudSavesEligible(account: Account | null | undefined) {
  return Boolean(
    account &&
      account.is_guest !== true &&
      (account.email_verified === true || Boolean(account.discord)),
  )
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
  options?: ApiRequestOptions,
): Promise<Response | null> {
  const baseUrl = getEnv().NEXTENDO_ACCOUNT_BASE_URL
  const url = baseUrl ? `${baseUrl}${path}` : path
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(options?.cookie ? { Cookie: options.cookie } : {}),
        ...(init?.headers ?? {}),
      },
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

export type AuthResult<T> =
  | { ok: true; data: T; setCookie?: string }
  | { ok: false; error: string; setCookie?: string }

type PostInit = Omit<RequestInit, 'method' | 'body' | 'headers' | 'next'> & {
  headers?: Record<string, string>
  next?: { revalidate?: number; tags?: string[] }
}

async function postJson<T>(
  path: string,
  body: unknown,
  init?: PostInit,
  options?: ApiRequestOptions,
): Promise<AuthResult<T>> {
  const res = await apiFetch(
    path,
    {
      method: 'POST',
      body: JSON.stringify(body),
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    },
    options,
  )
  if (!res) return { ok: false, error: 'network' }
  const setCookie = res.headers?.get?.('set-cookie') ?? undefined
  let data: T & { error?: string } = {} as T & { error?: string }
  try {
    data = (await res.json()) as T & { error?: string }
  } catch {
    // Empty body is fine for some endpoints.
  }
  if (!res.ok) return { ok: false, error: data.error ?? `http_${res.status}`, setCookie }
  return { ok: true, data, setCookie }
}

async function putJson<T>(
  path: string,
  body: unknown,
  init?: PostInit,
  options?: ApiRequestOptions,
): Promise<AuthResult<T>> {
  const res = await apiFetch(
    path,
    {
      method: 'PUT',
      body: JSON.stringify(body),
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    },
    options,
  )
  if (!res) return { ok: false, error: 'network' }
  const setCookie = res.headers?.get?.('set-cookie') ?? undefined
  let data: T & { error?: string } = {} as T & { error?: string }
  try {
    data = (await res.json()) as T & { error?: string }
  } catch {
    // Empty body is fine for some endpoints.
  }
  if (!res.ok) return { ok: false, error: data.error ?? `http_${res.status}`, setCookie }
  return { ok: true, data, setCookie }
}

export type RegisterPayload = {
  username: string
  email: string
  password: string
  country: string
}

export async function setCountry(
  country: string,
  options?: ApiRequestOptions,
): Promise<AuthResult<{ country?: string }>> {
  return postJson('/api/country', { country }, undefined, options)
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
  opts?: { turnstile?: string; cookie?: string },
): Promise<AuthResult<{ account?: Account; nex_token?: string }>> {
  return postJson(
    '/api/login',
    payload,
    {
      headers: opts?.turnstile ? { 'Cf-Turnstile-Response': opts.turnstile } : undefined,
    },
    opts,
  )
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

export async function fetchMe(options?: ApiRequestOptions): Promise<Account | null> {
  const res = await apiFetch('/api/me', { cache: 'no-store' }, options)
  if (!res || !res.ok) return null
  try {
    const data = (await res.json()) as unknown
    const parsed = z.object({ account: accountSchema.optional() }).safeParse(data)
    return parsed.success ? (parsed.data.account ?? null) : null
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

export async function changeEmail(
  email: string,
  password: string,
  options?: ApiRequestOptions,
): Promise<AuthResult<null>> {
  return postJson('/api/email', { email, password }, undefined, options)
}

export async function deleteAccount(
  password: string,
  options?: ApiRequestOptions,
): Promise<AuthResult<null>> {
  return postJson('/api/delete-account', { password }, undefined, options)
}

// Cloud saves: upstream keeps the session in the HttpOnly cookie. These
// helpers intentionally accept a forwarded cookie only on the server.
export async function fetchSaves(options?: ApiRequestOptions): Promise<SavesResponse | null> {
  const res = await apiFetch('/api/saves', undefined, options)
  if (!res || !res.ok) return null
  try {
    return normalizeSavesResponse(await res.json())
  } catch {
    return null
  }
}

export async function fetchParsedSave(
  titleId: string,
  locale: string,
  options?: ApiRequestOptions,
) {
  const validTitleId = titleIdSchema.safeParse(titleId)
  const validLocale = saveLocaleSchema.safeParse(locale)
  if (!validTitleId.success || !validLocale.success) return null
  const res = await apiFetch(
    `/api/save/${encodeURIComponent(validTitleId.data)}/parsed?lang=${encodeURIComponent(validLocale.data)}`,
    undefined,
    options,
  )
  if (!res || !res.ok) return null
  try {
    return (await res.json()) as unknown
  } catch {
    return null
  }
}

export async function fetchSaveBinary(titleId: string, options?: ApiRequestOptions) {
  const validTitleId = titleIdSchema.safeParse(titleId)
  if (!validTitleId.success) return null
  return apiFetch(`/api/save/${encodeURIComponent(validTitleId.data)}`, undefined, options)
}

export async function removeSave(
  titleId: string,
  options?: ApiRequestOptions,
): Promise<AuthResult<unknown>> {
  const validTitleId = titleIdSchema.safeParse(titleId)
  if (!validTitleId.success) return { ok: false, error: 'invalid_title_id' }
  const res = await apiFetch(
    `/api/save/${encodeURIComponent(validTitleId.data)}`,
    { method: 'DELETE' },
    options,
  )
  if (!res) return { ok: false, error: 'network' }
  if (res.ok) return { ok: true, data: {} }
  let error = `http_${res.status}`
  try {
    const data = (await res.json()) as { error?: string }
    error = data.error ?? error
  } catch {
    // Empty error bodies are valid upstream responses.
  }
  return { ok: false, error }
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

export async function fetchSessions(
  options?: ApiRequestOptions,
): Promise<{ sessions: Session[] } | null> {
  const res = await apiFetch('/api/sessions', undefined, options)
  if (!res || !res.ok) return null
  try {
    const data = (await res.json()) as { sessions?: Session[] }
    return { sessions: data.sessions ?? [] }
  } catch {
    return null
  }
}

export async function revokeSession(
  id: string,
  options?: ApiRequestOptions,
): Promise<AuthResult<unknown>> {
  return postJson('/api/sessions/revoke', { id }, undefined, options)
}

export async function revokeAllSessions(options?: ApiRequestOptions): Promise<AuthResult<unknown>> {
  return postJson('/api/sessions/revoke-all', {}, undefined, options)
}
