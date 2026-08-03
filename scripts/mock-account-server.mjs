#!/usr/bin/env node
// ============================================================================
// In-memory mock for the Go account service (`nextendo-account`).
// ----------------------------------------------------------------------------
// Used by:
//   - Manual testing: `node scripts/mock-account-server.mjs [--port 8080]`
//   - Playwright e2e: configured in playwright.config.ts via the `webServer`
//     block, so tests run the bundle against this server (no page.route()).
//
// Zero external dependencies — only Node's built-in `http`. State lives in
// RAM and is reseeded by POST /__mock/reset between tests.
//
// Endpoints implemented: every route the front-end calls (see
// src/lib/api.ts). Error semantics mirror the real Go backend: backend
// returns a JSON `{ error: 'snake_case_code' }` body on 4xx/5xx and our
// apiFetch typed client normalises those into AuthResult.
// ============================================================================

import http from 'node:http'
import { URL } from 'node:url'

const args = process.argv.slice(2)
const PORT = Number(
  args.find((a, i) => a === '--port' && args[i + 1])
    ? args[args.indexOf('--port') + 1]
    : process.env.MOCK_PORT ?? 8080,
)
const LATENCY_MS = Number(
  process.env.MOCK_LATENCY_MS ?? (args.includes('--no-latency') ? 0 : 30),
)

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const NOW = () => new Date().toISOString()

const ACCOUNT = {
  username: 'Inkling_Pro',
  email: 'inkling@example.com',
  password: 'Test123!',
  pid: 'NX-ABCDEF',
  friend_code: 'SW-1234-5678-9012',
  email_verified: true,
  is_guest: false,
  color: '#1ca9e0',
  avatar: 'ph-game-controller',
  image: null,
  created_at: '2024-03-15T10:00:00.000Z',
}

const PROFILE = {
  name: 'Inkling_Pro',
  color: '#1ca9e0',
  avatar: 'ph-game-controller',
  image: null,
}

const FRIENDS = [
  {
    pid: 'NX-AAAAAA',
    username: 'Buddy_One',
    name: 'Buddy One',
    friend_code: 'SW-1111-1111-1111',
    color: '#36ce73',
    avatar: 'ph-cat',
    favorite: false,
    created_at: '2024-04-01T10:00:00.000Z',
    presence: { status: 1, app_id: '0100000000010000', app_detail: 'Turf War' },
  },
  {
    pid: 'NX-BBBBBB',
    username: 'Buddy_Two',
    name: 'Buddy Two',
    friend_code: 'SW-2222-2222-2222',
    color: '#e4404a',
    avatar: 'ph-ghost',
    favorite: false,
    created_at: '2024-04-12T10:00:00.000Z',
    presence: { status: 0 },
  },
  {
    pid: 'NX-CCCCCC',
    username: 'Buddy_Three',
    name: 'Buddy Three',
    friend_code: 'SW-3333-3333-3333',
    color: '#f59e0b',
    avatar: 'ph-rocket',
    favorite: true,
    created_at: '2024-05-20T10:00:00.000Z',
    presence: { status: 1, app_id: '0100000000020000', app_detail: 'Grand Prix' },
  },
]

const REQUESTS = [
  {
    pid: 'NX-DDDDDD',
    username: 'Wannabe',
    name: 'Wannabe Friend',
    friend_code: 'SW-4444-4444-4444',
    color: '#8b5cf6',
    avatar: 'ph-star',
    created_at: '2024-06-01T10:00:00.000Z',
  },
]

const HISTORY = [
  {
    title_id: '0100000000010000',
    name: 'Splatoon 3',
    seconds: 7200,
    last_played: '2025-12-01T18:00:00.000Z',
    icon: null,
  },
  {
    title_id: '0100000000020000',
    name: 'Mario Kart 8 Deluxe',
    seconds: 1800,
    last_played: '2025-11-28T15:00:00.000Z',
    icon: null,
  },
]

const FRIEND_HISTORY = [
  {
    title_id: '0100000000010000',
    name: 'Splatoon 3',
    seconds: 14400,
    last_played: '2025-12-05T18:00:00.000Z',
    icon: null,
  },
]

const SESSIONS = [
  {
    id: 'sess_current',
    kind: 'browser',
    kind_label: 'Navigateur',
    current: true,
    ip: '127.0.0.1',
    geo: 'Paris',
    last_seen: new Date().toISOString(),
    created_at: '2025-01-15T10:00:00.000Z',
  },
  {
    id: 'sess_ryujinx',
    kind: 'ryujinx',
    kind_label: 'Ryujinx',
    current: false,
    playing: false,
    ip: '10.0.0.5',
    geo: 'Lyon',
    last_seen: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    created_at: '2025-02-20T10:00:00.000Z',
  },
  {
    id: 'sess_switch',
    kind: 'switch',
    kind_label: 'Nintendo Switch',
    current: false,
    playing: true,
    ip: '192.168.1.42',
    geo: 'Marseille',
    last_seen: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    created_at: '2025-03-10T10:00:00.000Z',
  },
]

const GAME_INFO = {
  '0100000000010000': {
    name: 'Splatoon 3',
    description:
      'A colorful, squid-themed online multiplayer shooter with turf-war, salmon run, and ranked battles.',
    accent: '#ff5a8a',
    hero: null,
    cover: null,
    screenshots: [],
    genres: ['Action', 'Shooter'],
    publisher: 'Nintendo',
    developer: 'Nintendo EPD',
    release_date: '2022-09-09',
    platforms: ['Nintendo Switch'],
    links: [
      { type: 'website', url: 'https://splatoon.nintendo.com' },
      { type: 'twitter', url: 'https://twitter.com/splatoonjp' },
    ],
    metacritic: 83,
  },
  '0100000000020000': {
    name: 'Mario Kart 8 Deluxe',
    description:
      'The definitive Mario Kart experience with 48 courses, 42 characters, and battle mode.',
    accent: '#e4404a',
    hero: null,
    cover: null,
    screenshots: [],
    genres: ['Racing', 'Party'],
    publisher: 'Nintendo',
    developer: 'Nintendo EPD',
    release_date: '2017-04-28',
    platforms: ['Nintendo Switch'],
    links: [{ type: 'website', url: 'https://mariokart8deluxe.nintendo.com' }],
    metacritic: 92,
  },
}

// ---------------------------------------------------------------------------
// Mutable state (reset by POST /__mock/reset)
// ---------------------------------------------------------------------------

const state = {
  account: structuredClone(ACCOUNT),
  profile: structuredClone(PROFILE),
  friends: structuredClone(FRIENDS),
  requests: structuredClone(REQUESTS),
  history: structuredClone(HISTORY),
  sessions: structuredClone(SESSIONS),
  takenUsernames: new Set(),
  emailVerified: true,
  // Sessions are also tracked by their bearer token so we can revoke them.
  // A revoked token returns 401 on protected endpoints.
  revokedTokens: new Set(),
}

state.takenUsernames.add('Inkling_Pro')
state.takenUsernames.add('admin')
state.takenUsernames.add('test_user')

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type, authorization, cookie',
  'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch {
        resolve({})
      }
    })
    req.on('error', reject)
  })
}

function send(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
    ...CORS_HEADERS,
    ...extraHeaders,
  })
  res.end(payload)
}

function sendNoBody(res, status, extraHeaders = {}) {
  res.writeHead(status, { 'cache-control': 'no-store', ...CORS_HEADERS, ...extraHeaders })
  res.end()
}

async function delay() {
  if (LATENCY_MS > 0) {
    await new Promise((r) => setTimeout(r, LATENCY_MS))
  }
}

function requireAuth(req, res) {
  const cookie = req.headers.cookie ?? ''
  const auth = req.headers.authorization ?? ''
  // The front-end sends either a Bearer token from localStorage (legacy) or
  // relies on the HttpOnly cookie set by the real backend. Both should work.
  if (!/nx_session=/.test(cookie) && !auth.startsWith('Bearer ')) {
    send(res, 401, { error: 'unauthorized' })
    return false
  }
  const token = auth.replace(/^Bearer\s+/i, '') || cookie.match(/nx_session=([^;]+)/)?.[1] || ''
  if (state.revokedTokens.has(token)) {
    send(res, 401, { error: 'session_revoked' })
    return false
  }
  return true
}

function publicAccount() {
  // Strip the password before returning.
  const { password: _pw, ...safe } = state.account
  return safe
}

// ---------------------------------------------------------------------------
// Route handlers — return a { status, body } tuple. The dispatcher writes
// the response with the right Content-Type.
// ---------------------------------------------------------------------------

async function handle(req, res, url, body) {
  const p = url.pathname
  const q = url.searchParams

  // ---- Meta endpoints (not part of the real backend, used for tests) ----
  if (p === '/__mock/reset' && req.method === 'POST') {
    state.account = structuredClone(ACCOUNT)
    state.profile = structuredClone(PROFILE)
    state.friends = structuredClone(FRIENDS)
    state.requests = structuredClone(REQUESTS)
    state.history = structuredClone(HISTORY)
    state.sessions = structuredClone(SESSIONS)
    state.takenUsernames = new Set([ACCOUNT.username, 'admin', 'test_user'])
    state.emailVerified = true
    state.revokedTokens = new Set()
    return { status: 200, body: { ok: true } }
  }
  if (p === '/__mock/seed-friend' && req.method === 'POST') {
    state.requests = [...state.requests, body]
    return { status: 200, body: { ok: true } }
  }

  // ---- Public endpoints ----
  if (p === '/api/site-config') {
    return {
      status: 200,
      body: { registration_open: true, version: '1.0.0' },
    }
  }
  if (p === '/api/online-counts') {
    const counts = {
      splatoon: 12,
      mk8: 8,
      'smash-ultimate': 4,
      'animal-crossing': 6,
    }
    if (q.get('seed') === 'down') {
      return { status: 200, body: { counts: {} } }
    }
    return { status: 200, body: { counts } }
  }

  // ---- Auth ----
  if (p === '/api/login') {
    if (
      body.login === state.account.email &&
      body.password === state.account.password
    ) {
      return { status: 200, body: { account: publicAccount(), nex_token: 'mock_nex_token' } }
    }
    return { status: 401, body: { error: 'invalid_credentials' } }
  }
  if (p === '/api/register') {
    if (state.takenUsernames.has(body.username)) {
      return { status: 409, body: { error: 'username_taken' } }
    }
    if (body.email === state.account.email) {
      return { status: 409, body: { error: 'email_taken' } }
    }
    if (body.password !== body.password2) {
      return { status: 400, body: { error: 'passwords_mismatch' } }
    }
    state.takenUsernames.add(body.username)
    return {
      status: 200,
      body: { account: { username: body.username, email: body.email }, nex_token: 'mock_nex_token' },
    }
  }
  if (p === '/api/forgot') {
    return { status: 200, body: {} }
  }
  if (p === '/api/reset') {
    if (!body.token) return { status: 400, body: { error: 'no_token' } }
    return { status: 200, body: {} }
  }
  if (p === '/api/verify') {
    if (!q.get('token')) return { status: 400, body: { error: 'no_token' } }
    if (q.get('token') === 'expired') return { status: 410, body: { error: 'token_expired' } }
    return { status: 200, body: { email: state.account.email } }
  }
  if (p === '/api/resend-verification') {
    return { status: 200, body: {} }
  }

  // ---- Public endpoints (no auth required) ----
  // /api/gameinfo is intentionally public so anonymous visitors can
  // browse game metadata without signing in. /api/username-available
  // is public so the register form can validate uniqueness live.
  if (p === '/api/gameinfo') {
    const tid = (q.get('title_id') ?? '').toLowerCase()
    const name = q.get('name') ?? ''
    const info =
      GAME_INFO[tid] ??
      Object.values(GAME_INFO).find((g) => g.name.toLowerCase() === name.toLowerCase()) ??
      null
    return { status: 200, body: info ?? { name: name || 'Unknown Game' } }
  }
  if (p === '/api/username-available') {
    const u = (q.get('username') ?? '').trim()
    return { status: 200, body: { available: !state.takenUsernames.has(u) } }
  }

  // ---- Authenticated endpoints ----
  if (!(await requireAuth(req, res))) return null

  if (p === '/api/me') {
    return { status: 200, body: { account: { ...publicAccount(), email_verified: state.emailVerified } } }
  }
  if (p === '/api/profile' && req.method === 'GET') {
    return { status: 200, body: state.profile }
  }
  if (p === '/api/profile' && req.method === 'PUT') {
    state.profile = { ...state.profile, ...body }
    if (body.color) state.account.color = body.color
    if (body.image !== undefined) state.profile.image = body.image
    return { status: 200, body: state.profile }
  }

  // Friends
  if (p === '/api/friends' && req.method === 'GET') {
    return { status: 200, body: { friends: state.friends, requests: state.requests } }
  }
  if (p === '/api/friends' && req.method === 'POST') {
    return { status: 200, body: {} }
  }
  if (p === '/api/friends/accept') {
    const pid = body.pid
    const idx = state.requests.findIndex((r) => String(r.pid) === String(pid))
    if (idx < 0) return { status: 400, body: { error: 'not_pending' } }
    const [r] = state.requests.splice(idx, 1)
    state.friends.push({ ...r, presence: { status: 0 } })
    return { status: 200, body: {} }
  }
  if (p === '/api/friends/decline') {
    const idx = state.requests.findIndex((r) => String(r.pid) === String(body.pid))
    if (idx >= 0) state.requests.splice(idx, 1)
    return { status: 200, body: {} }
  }
  if (p === '/api/friends/remove') {
    state.friends = state.friends.filter((f) => String(f.pid) !== String(body.pid))
    return { status: 200, body: {} }
  }
  if (p === '/api/friends/block') {
    state.friends = state.friends.filter((f) => String(f.pid) !== String(body.pid))
    return { status: 200, body: {} }
  }
  if (p === '/api/friends/favorite') {
    state.friends = state.friends.map((f) =>
      String(f.pid) === String(body.pid) ? { ...f, favorite: Boolean(body.on) } : f,
    )
    return { status: 200, body: {} }
  }
  if (p === '/api/friends/history') {
    return { status: 200, body: { history: FRIEND_HISTORY } }
  }

  // Username / email / delete
  if (p === '/api/username' && req.method === 'PUT') {
    if (state.takenUsernames.has(body.username)) {
      return { status: 409, body: { error: 'username_taken' } }
    }
    const old = state.account.username
    state.takenUsernames.delete(old)
    state.takenUsernames.add(body.username)
    state.account.username = body.username
    state.profile.name = body.username
    return { status: 200, body: {} }
  }
  if (p === '/api/email') {
    if (body.password !== state.account.password) {
      return { status: 401, body: { error: 'invalid_password' } }
    }
    state.account.email = body.email
    state.emailVerified = false
    return { status: 200, body: {} }
  }
  if (p === '/api/delete-account') {
    if (body.password !== state.account.password) {
      return { status: 401, body: { error: 'invalid_password' } }
    }
    // Reset all state.
    state.account = structuredClone(ACCOUNT)
    state.profile = structuredClone(PROFILE)
    state.friends = structuredClone(FRIENDS)
    state.requests = structuredClone(REQUESTS)
    state.history = structuredClone(HISTORY)
    state.sessions = structuredClone(SESSIONS)
    state.emailVerified = true
    state.revokedTokens = new Set()
    return { status: 200, body: {} }
  }

  // History + gameinfo
  if (p === '/api/history') {
    return { status: 200, body: { history: state.history } }
  }

  // Sessions
  if (p === '/api/sessions') {
    return { status: 200, body: { sessions: state.sessions } }
  }
  if (p === '/api/sessions/revoke') {
    const idx = state.sessions.findIndex((s) => s.id === body.id)
    if (idx < 0) return { status: 404, body: { error: 'session_not_found' } }
    const revoked = state.sessions.splice(idx, 1)[0]
    if (revoked.current) state.revokedTokens.add('current')
    return { status: 200, body: {} }
  }
  if (p === '/api/sessions/revoke-all') {
    state.sessions = []
    state.revokedTokens.add('current')
    return { status: 200, body: {} }
  }

  return { status: 404, body: { error: 'not_found', path: p, method: req.method } }
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  await delay()

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return sendNoBody(res, 204, CORS_HEADERS)
  }

  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  let body
  try {
    body = await readBody(req)
  } catch {
    return send(res, 400, { error: 'invalid_json' })
  }

  let result
  try {
    result = await handle(req, res, url, body)
  } catch (err) {
    console.error('[mock] handler error:', err)
    return send(res, 500, { error: 'internal_error' })
  }

  if (result === null) {
    // requireAuth already wrote a 401 response.
    return
  }

  const { status, body: payload } = result
  send(res, status, payload)
})

server.listen(PORT, () => {
  console.log(`[mock-account] listening on http://localhost:${PORT}`)
  console.log(`[mock-account] latency: ${LATENCY_MS}ms per request`)
  console.log(`[mock-account] fixture user: ${ACCOUNT.email} / ${ACCOUNT.password}`)
  console.log(`[mock-account] reset endpoint: POST /__mock/reset`)
})

// Graceful shutdown
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`[mock-account] received ${sig}, shutting down`)
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(1), 5000).unref()
  })
}
