'use server'

import {
  fetchSiteConfig,
  forgotPassword,
  loginAccount,
  registerAccount,
  resendVerification,
  resetPassword,
  verifyEmail,
} from '@/lib/api'
import { forgotSchema, loginSchema, registerSchema, resetSchema } from '@/lib/schemas'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const NEX_TOKEN_COOKIE = 'nx_nex_token'
const SESSION_COOKIE = 'nx_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 365

// Translation keys for known backend errors — kept generic so the page can
// localize them via t(`auth.errors.${key}`).
type ErrorKey =
  | 'network'
  | 'invalidCredentials'
  | 'emailTaken'
  | 'usernameTaken'
  | 'invalidEmail'
  | 'invalidUsername'
  | 'passwordTooWeak'
  | 'passwordsMismatch'
  | 'closedRegistration'
  | 'turnstile'
  | 'unknown'

function normalizeError(raw: string | undefined): ErrorKey {
  if (!raw) return 'unknown'
  const lc = raw.toLowerCase()
  if (lc.includes('network')) return 'network'
  if (lc.includes('invalid') && lc.includes('credential')) return 'invalidCredentials'
  if (lc.includes('email') && (lc.includes('used') || lc.includes('taken'))) return 'emailTaken'
  if (lc.includes('username') && (lc.includes('used') || lc.includes('taken')))
    return 'usernameTaken'
  if (lc.includes('turnstile')) return 'turnstile'
  if (lc.includes('username')) return 'invalidUsername'
  if (lc.includes('password')) return 'passwordTooWeak'
  if (lc.includes('email')) return 'invalidEmail'
  return 'unknown'
}

function fail(errorKey: ErrorKey, fieldErrors: Record<string, string> = {}) {
  return { ok: false as const, error: errorKey, fieldErrors }
}

async function setNexToken(token: string | undefined) {
  if (!token) return
  const store = await cookies()
  store.set({
    name: NEX_TOKEN_COOKIE,
    value: token,
    sameSite: 'lax',
    httpOnly: false,
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
}

async function setSessionFromBackend(setCookie: string | undefined) {
  const match = setCookie?.match(/(?:^|,\s*)nx_session=([^;]+)/)
  if (!match) return
  const store = await cookies()
  store.set({
    name: SESSION_COOKIE,
    value: decodeURIComponent(match[1]),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
}

export async function clearNexToken() {
  const store = await cookies()
  store.delete(NEX_TOKEN_COOKIE)
  store.delete(SESSION_COOKIE)
}

function redirectAfterAuth(locale: string, next: string | null): never {
  // next is same-origin path or null. We accept anything starting with `/`
  // (and not `//`) so open-redirect is impossible.
  const dest = next?.startsWith('/') && !next.startsWith('//') ? next : `/${locale}/compte`
  redirect(dest)
}

export async function loginAction(input: {
  login: string
  password: string
  next: string | null
  locale: string
  turnstile?: string
}): Promise<{ ok: true } | ReturnType<typeof fail>> {
  const parsed = loginSchema.safeParse({ login: input.login, password: input.password })
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string') fieldErrors[key] = issue.message
    }
    return fail('unknown', fieldErrors)
  }

  const result = await loginAccount(parsed.data, { turnstile: input.turnstile })
  if (!result.ok) {
    return fail(normalizeError(result.error))
  }

  await setSessionFromBackend(result.setCookie)
  if (result.data.nex_token) await setNexToken(result.data.nex_token)
  redirectAfterAuth(input.locale, input.next)
}

export async function registerAction(input: {
  username: string
  email: string
  password: string
  password2: string
  locale: string
  turnstile?: string
}): Promise<{ ok: true; nex_token?: string } | ReturnType<typeof fail>> {
  const parsed = registerSchema.safeParse({
    username: input.username,
    email: input.email,
    password: input.password,
    password2: input.password2,
  })
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string') fieldErrors[key] = issue.message
    }
    return fail('unknown', fieldErrors)
  }

  // Mirror the legacy client behavior: pre-check site-config to display the
  // "sign-ups closed" banner before submitting credentials.
  const config = await fetchSiteConfig()
  if (config?.registration_open === false) {
    return fail('closedRegistration')
  }

  const result = await registerAccount(parsed.data, { turnstile: input.turnstile })
  if (!result.ok) return fail(normalizeError(result.error))

  if (result.data.nex_token) await setNexToken(result.data.nex_token)
  return { ok: true, nex_token: result.data.nex_token }
}

export async function forgotAction(input: {
  email: string
  locale: string
}): Promise<{ ok: true } | ReturnType<typeof fail>> {
  const parsed = forgotSchema.safeParse({ email: input.email })
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string') fieldErrors[key] = issue.message
    }
    return fail('unknown', fieldErrors)
  }

  const result = await forgotPassword(parsed.data)
  if (!result.ok) return fail(normalizeError(result.error))
  return { ok: true }
}

export async function resetAction(input: {
  password: string
  password2: string
  token: string
  locale: string
}): Promise<{ ok: true } | ReturnType<typeof fail>> {
  const parsed = resetSchema.safeParse({
    password: input.password,
    password2: input.password2,
    token: input.token,
  })
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string') fieldErrors[key] = issue.message
    }
    return fail('unknown', fieldErrors)
  }

  const result = await resetPassword(parsed.data)
  if (!result.ok) return fail(normalizeError(result.error))
  redirectAfterAuth(input.locale, '/login')
}

export async function verifyAction(input: {
  token: string
}): Promise<{ ok: true; email?: string } | { ok: false; error: ErrorKey }> {
  if (!input.token) return { ok: false, error: 'unknown' }
  const result = await verifyEmail(input.token)
  if (!result.ok) return { ok: false, error: normalizeError(result.error) }
  return { ok: true, email: result.data.email }
}

export async function resendAction(): Promise<{ ok: true } | { ok: false; error: ErrorKey }> {
  const result = await resendVerification()
  if (!result.ok) return { ok: false, error: normalizeError(result.error) }
  return { ok: true }
}

export async function logoutAction(locale: string) {
  await clearNexToken()
  redirect(`/${locale}`)
}
