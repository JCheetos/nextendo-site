'use server'

import { revokeAllSessions, revokeSession } from '@/lib/api'
import { clearNexToken } from '@/server/auth'
import { getRequestCookieHeader } from '@/server/request'
import { redirect } from 'next/navigation'

type SessionsErrorKey = 'network' | 'invalidSession' | 'unknown'

function normalizeError(raw: string | undefined): SessionsErrorKey {
  if (!raw) return 'unknown'
  const lc = raw.toLowerCase()
  if (lc.includes('network')) return 'network'
  if (lc.includes('session') || lc.includes('invalide')) return 'invalidSession'
  return 'unknown'
}

function fail(errorKey: SessionsErrorKey) {
  return { ok: false as const, error: errorKey }
}

export async function revokeSessionAction(input: {
  id: string
  isCurrent: boolean
  locale: string
}): Promise<{ ok: true } | ReturnType<typeof fail>> {
  const result = await revokeSession(input.id, { cookie: await getRequestCookieHeader() })
  if (!result.ok) return fail(normalizeError(result.error))

  // If the user revoked their own current session, force-logout server-side
  // (clears cookies + redirects to the home page).
  if (input.isCurrent) {
    await clearNexToken()
    redirect(`/${input.locale}`)
  }
  return { ok: true }
}

export async function revokeAllSessionsAction(input: {
  locale: string
}): Promise<{ ok: true } | ReturnType<typeof fail>> {
  const result = await revokeAllSessions({ cookie: await getRequestCookieHeader() })
  if (!result.ok) return fail(normalizeError(result.error))
  await clearNexToken()
  redirect(`/${input.locale}`)
}
