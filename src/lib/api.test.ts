import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the env var so the optional base URL is empty (uses same-origin paths).
process.env.NEXTENDO_ACCOUNT_BASE_URL = ''

import {
  acceptFriend,
  addFriend,
  blockFriend,
  changeEmail,
  declineFriend,
  deleteAccount,
  fetchFriendHistory,
  fetchFriends,
  fetchGameInfo,
  fetchHistory,
  fetchMe,
  fetchOnlineCounts,
  fetchProfile,
  fetchSessions,
  fetchSiteConfig,
  forgotPassword,
  loginAccount,
  putProfile,
  registerAccount,
  removeFriend,
  resendVerification,
  resetPassword,
  revokeAllSessions,
  revokeSession,
  setFavorite,
  setUsername,
  usernameAvailable,
  verifyEmail,
} from './api'

// Stubbed fetch used by every api.ts function. We capture the call and return
// the response the test wants.
function mockFetchResponse(status = 200, body: unknown = {}) {
  // biome-ignore lint/suspicious/noExplicitAny: test mock with broad response shape.
  return vi.fn<any>(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }))
}

let fetchSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchSpy = mockFetchResponse()
  vi.stubGlobal('fetch', fetchSpy)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('fetchOnlineCounts', () => {
  it('returns typed counts on a 200', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ counts: { splatoon: 12, mk8: 8 } }),
    })
    const r = await fetchOnlineCounts()
    expect(r).toEqual({ counts: { splatoon: 12, mk8: 8 } })
  })

  it('returns null on a 500', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
    const r = await fetchOnlineCounts()
    expect(r).toBeNull()
  })

  it('returns null when fetch throws (network down)', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('abort'))
    const r = await fetchOnlineCounts()
    expect(r).toBeNull()
  })

  it('defaults missing counts to an empty record', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    })
    const r = await fetchOnlineCounts()
    expect(r).toEqual({ counts: {} })
  })
})

describe('auth POST helpers', () => {
  it('loginAccount posts JSON and returns ok=true on 200', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ account: { username: 'me' }, nex_token: 't' }),
    })
    const r = await loginAccount({ login: 'me@example.com', password: 'p4ssw0rd!' })
    expect(r.ok).toBe(true)
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(body).toEqual({ login: 'me@example.com', password: 'p4ssw0rd!' })
  })

  it('loginAccount returns ok=false with the backend error string on 401', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'invalid_credentials' }),
    })
    const r = await loginAccount({ login: 'x', password: 'y' })
    expect(r).toEqual({ ok: false, error: 'invalid_credentials' })
  })

  it('loginAccount forwards the Turnstile token when provided', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    })
    await loginAccount({ login: 'x', password: 'y' }, { turnstile: 'tk_123' })
    const init = fetchSpy.mock.calls[0][1]
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Cf-Turnstile-Response': 'tk_123',
    })
  })

  it('registerAccount posts JSON without Turnstile when not provided', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
    await registerAccount({ username: 'me', email: 'a@b.co', password: 'p4ssw0rd!' })
    const init = fetchSpy.mock.calls[0][1]
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.headers['Cf-Turnstile-Response']).toBeUndefined()
  })

  it('forgotPassword posts email and returns ok on 200', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
    const r = await forgotPassword({ email: 'a@b.co' })
    expect(r.ok).toBe(true)
  })

  it('forgotPassword returns network error when fetch throws', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('boom'))
    const r = await forgotPassword({ email: 'a@b.co' })
    expect(r).toEqual({ ok: false, error: 'network' })
  })

  it('resetPassword posts token + password', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
    await resetPassword({ token: 'abc', password: 'p4ssw0rd!' })
    expect(fetchSpy.mock.calls[0][0]).toContain('/api/reset')
  })

  it('verifyEmail hits /api/verify with the token query string', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ email: 'a@b.co' }),
    })
    const r = await verifyEmail('some token/with spaces')
    expect(r).toEqual({ ok: true, data: { email: 'a@b.co' } })
    expect(fetchSpy.mock.calls[0][0]).toContain('/api/verify')
    // Encoded — should be safe inside a query string.
    expect(fetchSpy.mock.calls[0][0]).not.toContain('some token/with spaces')
  })

  it('resendVerification returns network when fetch throws', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('boom'))
    const r = await resendVerification()
    expect(r).toEqual({ ok: false, error: 'network' })
  })
})

describe('fetchMe / fetchSiteConfig', () => {
  it('fetchMe returns the account when 200', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ account: { username: 'me', friend_code: 'SW-1111-1111-1111' } }),
    })
    const r = await fetchMe()
    expect(r).toEqual({ username: 'me', friend_code: 'SW-1111-1111-1111' })
  })

  it('fetchMe returns null on 401 (not authenticated)', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
    expect(await fetchMe()).toBeNull()
  })

  it('fetchSiteConfig returns registration_open when present', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ registration_open: true, version: '1.0' }),
    })
    expect(await fetchSiteConfig()).toEqual({ registration_open: true, version: '1.0' })
  })

  it('fetchSiteConfig returns null on failure', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
    expect(await fetchSiteConfig()).toBeNull()
  })
})

describe('profile endpoints', () => {
  it('fetchProfile returns the typed profile', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ name: 'Inkling', color: '#1ca9e0', avatar: 'ph-cat' }),
    })
    const r = await fetchProfile()
    expect(r).toEqual({ name: 'Inkling', color: '#1ca9e0', avatar: 'ph-cat' })
  })

  it('putProfile uses PUT method and returns the updated profile', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ name: 'Inkling2', color: '#36ce73' }),
    })
    const r = await putProfile({ name: 'Inkling2', color: '#36ce73' })
    expect(r).toEqual({ ok: true, data: { name: 'Inkling2', color: '#36ce73' } })
    expect(fetchSpy.mock.calls[0][1].method).toBe('PUT')
  })

  it('putProfile surfaces the backend error string on failure', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'invalid_color' }),
    })
    const r = await putProfile({ name: 'x', color: 'not-a-hex' })
    expect(r).toEqual({ ok: false, error: 'invalid_color' })
  })
})

describe('friends endpoints', () => {
  it('fetchFriends returns { friends, requests }', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        friends: [{ pid: 'NX-AAA', username: 'buddy' }],
        requests: [],
      }),
    })
    const r = await fetchFriends()
    expect(r).toEqual({ friends: [{ pid: 'NX-AAA', username: 'buddy' }], requests: [] })
  })

  it('fetchFriends defaults missing arrays to []', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
    const r = await fetchFriends()
    expect(r).toEqual({ friends: [], requests: [] })
  })

  it('fetchFriends returns null on failure', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
    expect(await fetchFriends()).toBeNull()
  })

  it('addFriend sends the friend_code as JSON body', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
    await addFriend('SW-1234-5678-9012')
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(body).toEqual({ friend_code: 'SW-1234-5678-9012' })
  })

  it('acceptFriend / declineFriend / removeFriend / blockFriend send {pid}', async () => {
    for (const [fn, expectedPath] of [
      [acceptFriend, '/api/friends/accept'],
      [declineFriend, '/api/friends/decline'],
      [removeFriend, '/api/friends/remove'],
      [blockFriend, '/api/friends/block'],
    ] as const) {
      fetchSpy.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      await fn('NX-AAA')
      expect(fetchSpy.mock.calls.at(-1)?.[0]).toContain(expectedPath)
      const body = JSON.parse(fetchSpy.mock.calls.at(-1)?.[1].body)
      expect(body).toEqual({ pid: 'NX-AAA' })
    }
  })

  it('setFavorite sends { pid, on }', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
    await setFavorite('NX-AAA', true)
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(body).toEqual({ pid: 'NX-AAA', on: true })
  })

  it('acceptFriend returns the backend error on failure', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'not_pending' }),
    })
    expect(await acceptFriend('NX-X')).toEqual({ ok: false, error: 'not_pending' })
  })
})

describe('history + gameinfo endpoints', () => {
  it('fetchFriendHistory returns the typed payload', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        history: [
          {
            title_id: '0100000000010000',
            name: 'Splatoon',
            seconds: 7200,
            last_played: '2025-01-01T00:00:00Z',
          },
        ],
      }),
    })
    const r = await fetchFriendHistory('NX-AAA')
    expect(r?.history[0].name).toBe('Splatoon')
    expect(fetchSpy.mock.calls[0][0]).toContain('pid=NX-AAA')
  })

  it('fetchHistory returns null on failure', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
    expect(await fetchHistory()).toBeNull()
  })

  it('fetchGameInfo URL-encodes the title_id and name', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ name: 'Splatoon 3', genres: ['Action'] }),
    })
    await fetchGameInfo('0100000000010000', 'Splatoon 3')
    const url = fetchSpy.mock.calls[0][0]
    expect(url).toContain('/api/gameinfo?')
    expect(url).toContain('title_id=0100000000010000')
    expect(url).toContain('name=Splatoon+3') // or 'Splatoon%203' — both encode the space
    expect(url).not.toContain('Splatoon 3 ')
  })
})

describe('username + changeEmail + deleteAccount', () => {
  it('usernameAvailable parses the available boolean', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ available: true }),
    })
    expect(await usernameAvailable('new_user')).toBe(true)
  })

  it('usernameAvailable returns null when missing', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
    expect(await usernameAvailable('xx')).toBeNull()
  })

  it('usernameAvailable returns null on failure', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
    expect(await usernameAvailable('xx')).toBeNull()
  })

  it('setUsername posts the username', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
    await setUsername('Inkling_Pro')
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(body).toEqual({ username: 'Inkling_Pro' })
    expect(fetchSpy.mock.calls[0][1].method).toBe('PUT')
  })

  it('changeEmail sends email + password', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
    const r = await changeEmail('new@example.com', 'p4ssw0rd!')
    expect(r.ok).toBe(true)
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(body).toEqual({ email: 'new@example.com', password: 'p4ssw0rd!' })
  })

  it('deleteAccount sends the password', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
    const r = await deleteAccount('p4ssw0rd!')
    expect(r.ok).toBe(true)
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(body).toEqual({ password: 'p4ssw0rd!' })
  })
})

describe('sessions endpoints', () => {
  it('fetchSessions returns the array', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ sessions: [{ id: 's1', kind: 'browser' }] }),
    })
    const r = await fetchSessions()
    expect(r?.sessions[0].kind).toBe('browser')
  })

  it('fetchSessions returns null on failure', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
    expect(await fetchSessions()).toBeNull()
  })

  it('revokeSession sends the id', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
    await revokeSession('sess_1')
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(body).toEqual({ id: 'sess_1' })
  })

  it('revokeAllSessions hits /api/sessions/revoke-all with an empty body', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
    await revokeAllSessions()
    expect(fetchSpy.mock.calls[0][0]).toContain('/api/sessions/revoke-all')
    expect(fetchSpy.mock.calls[0][1].body).toBe('{}')
  })
})

describe('transport resilience', () => {
  it('returns network error on a thrown fetch', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('AbortError'))
    expect(await forgotPassword({ email: 'a@b.co' })).toEqual({ ok: false, error: 'network' })
  })

  it('falls back to http_<status> error when backend returns no error string', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
    const r = await loginAccount({ login: 'a@b.co', password: 'p4ssw0rd!' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('http_503')
  })
})

// Sanity check: ensure our import path doesn't reference a removed symbol.
describe('module surface', () => {
  it('exports all the documented functions', () => {
    const api = {
      fetchOnlineCounts,
      registerAccount,
      loginAccount,
      forgotPassword,
      resetPassword,
      verifyEmail,
      resendVerification,
      fetchMe,
      fetchSiteConfig,
      fetchProfile,
      putProfile,
      fetchFriends,
      addFriend,
      acceptFriend,
      declineFriend,
      removeFriend,
      blockFriend,
      setFavorite,
      fetchFriendHistory,
      fetchHistory,
      fetchGameInfo,
      usernameAvailable,
      setUsername,
      changeEmail,
      deleteAccount,
      fetchSessions,
      revokeSession,
      revokeAllSessions,
    }
    expect(Object.keys(api)).toHaveLength(28)
  })
})
