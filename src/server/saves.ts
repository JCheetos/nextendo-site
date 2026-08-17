'use server'

import { fetchMe, fetchParsedSave, isCloudSavesEligible, removeSave } from '@/lib/api'
import { saveLocaleSchema, titleIdSchema } from '@/lib/saves'
import { getRequestCookieHeader } from '@/server/request'
import { z } from 'zod'

const previewInputSchema = z.object({ titleId: titleIdSchema, locale: saveLocaleSchema })
const deleteInputSchema = z.object({ titleId: titleIdSchema })

export async function previewSaveAction(input: unknown) {
  const parsed = previewInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'invalid' }
  const cookie = await getRequestCookieHeader()
  if (!isCloudSavesEligible(await fetchMe({ cookie })))
    return { ok: false as const, error: 'unauthorized' }
  const data = await fetchParsedSave(parsed.data.titleId, parsed.data.locale, { cookie })
  return data === null ? { ok: false as const, error: 'unavailable' } : { ok: true as const, data }
}

export async function deleteSaveAction(input: unknown) {
  const parsed = deleteInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'invalid' }
  const cookie = await getRequestCookieHeader()
  if (!isCloudSavesEligible(await fetchMe({ cookie })))
    return { ok: false as const, error: 'unauthorized' }
  const result = await removeSave(parsed.data.titleId, { cookie })
  return result.ok ? { ok: true as const } : { ok: false as const, error: result.error }
}
