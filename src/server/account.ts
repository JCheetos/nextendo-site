'use server'

import { changeEmail, deleteAccount, setCountry } from '@/lib/api'
import { changeEmailSchema, countrySchema, deleteAccountSchema } from '@/lib/schemas'
import { getRequestCookieHeader } from '@/server/request'
import { redirect } from 'next/navigation'

type AccountErrorKey = 'network' | 'invalidPassword' | 'emailTaken' | 'invalidEmail' | 'unknown'

function normalizeError(raw: string | undefined): AccountErrorKey {
  if (!raw) return 'unknown'
  const lc = raw.toLowerCase()
  if (lc.includes('network')) return 'network'
  if (lc.includes('password')) return 'invalidPassword'
  if (lc.includes('email') && (lc.includes('used') || lc.includes('taken'))) return 'emailTaken'
  if (lc.includes('email')) return 'invalidEmail'
  return 'unknown'
}

function fail(errorKey: AccountErrorKey, fieldErrors: Record<string, string> = {}) {
  return { ok: false as const, error: errorKey, fieldErrors }
}

export async function changeEmailAction(input: {
  email: string
  password: string
}): Promise<{ ok: true } | ReturnType<typeof fail>> {
  const parsed = changeEmailSchema.safeParse({ email: input.email, password: input.password })
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string') fieldErrors[key] = issue.message
    }
    return fail('unknown', fieldErrors)
  }

  const result = await changeEmail(parsed.data.email, parsed.data.password, {
    cookie: await getRequestCookieHeader(),
  })
  if (!result.ok) return fail(normalizeError(result.error))
  return { ok: true }
}

export async function deleteAccountAction(input: {
  password: string
  locale: string
}): Promise<{ ok: true } | ReturnType<typeof fail>> {
  const parsed = deleteAccountSchema.safeParse({ password: input.password })
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string') fieldErrors[key] = issue.message
    }
    return fail('unknown', fieldErrors)
  }

  const result = await deleteAccount(parsed.data.password, {
    cookie: await getRequestCookieHeader(),
  })
  if (!result.ok) return fail(normalizeError(result.error))
  // After deletion, force the client to land on the homepage — the session
  // cookie is dead, so /compte would 401 on the next request.
  redirect(`/${input.locale}`)
}

export async function setCountryAction(input: { country: string }): Promise<
  { ok: true } | ReturnType<typeof fail>
> {
  const parsed = countrySchema.safeParse(input.country)
  if (!parsed.success)
    return fail('unknown', { country: parsed.error.issues[0]?.message ?? 'country.invalid' })
  const result = await setCountry(parsed.data, { cookie: await getRequestCookieHeader() })
  if (!result.ok) return fail(normalizeError(result.error))
  return { ok: true }
}
