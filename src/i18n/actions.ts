'use server'

import { type Locale, isLocale } from '@/i18n/config'
import { routing } from '@/i18n/routing'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'nx_lang'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export async function setLocaleAction(formData: FormData) {
  const requested = formData.get('locale')
  if (typeof requested !== 'string' || !isLocale(requested)) return

  const cookieStore = await cookies()
  cookieStore.set({
    name: COOKIE_NAME,
    value: requested,
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
    path: '/',
  })

  revalidatePath('/', 'layout')
  // Silence the unused-warning for the routing import (kept in sync).
  void routing
}

export type { Locale }
