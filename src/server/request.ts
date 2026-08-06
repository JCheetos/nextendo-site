'use server'

import { cookies } from 'next/headers'

export async function getRequestCookieHeader() {
  return (await cookies()).toString()
}
