import { locales } from '@/i18n/config'
import { z } from 'zod'

const recordSchema = z.record(z.string(), z.unknown())
export const titleIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9._-]+$/)
export const saveLocaleSchema = z.enum(locales)

export const saveSchema = z.object({
  titleId: titleIdSchema,
  title: z.string().trim().min(1),
  size: z.number().nonnegative(),
  updatedAt: z.string().optional(),
  supported: z.boolean().optional(),
})

export type CloudSave = z.infer<typeof saveSchema>

export type SaveQuota = {
  used: number
  limit: number
  booster: boolean
}

export type SavesResponse = {
  saves: CloudSave[]
  quota: SaveQuota
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
}

function booleanValue(value: unknown) {
  return typeof value === 'boolean' ? value : false
}

function normalizeSave(value: unknown): CloudSave | null {
  const item = recordSchema.safeParse(value)
  if (!item.success) return null
  const raw = item.data
  const titleIdResult = titleIdSchema.safeParse(raw.title_id ?? raw.titleId ?? raw.id)
  if (!titleIdResult.success) return null
  const titleId = titleIdResult.data
  const candidate = {
    titleId,
    title: stringValue(raw.title ?? raw.name ?? raw.title_name, titleId),
    size: numberValue(raw.size ?? raw.size_bytes ?? raw.bytes),
    updatedAt:
      typeof raw.updated_at === 'string'
        ? raw.updated_at
        : typeof raw.updatedAt === 'string'
          ? raw.updatedAt
          : undefined,
    supported: typeof raw.supported === 'boolean' ? raw.supported : undefined,
  }
  return saveSchema.parse(candidate)
}

export function normalizeSavesResponse(value: unknown): SavesResponse {
  const root = recordSchema.safeParse(value)
  const raw = root.success ? root.data : {}
  const list = Array.isArray(value)
    ? value
    : Array.isArray(raw.saves)
      ? raw.saves
      : Array.isArray(raw.items)
        ? raw.items
        : []
  const saves = list.map(normalizeSave).filter((save): save is CloudSave => save !== null)
  const quotaRaw = recordSchema.safeParse(raw.quota).success
    ? (raw.quota as Record<string, unknown>)
    : raw
  const used = numberValue(quotaRaw.used ?? quotaRaw.used_bytes ?? quotaRaw.bytes_used)
  const limit = numberValue(quotaRaw.limit ?? quotaRaw.limit_bytes ?? quotaRaw.max_bytes)
  return {
    saves,
    quota: {
      used,
      limit,
      booster: booleanValue(raw.booster ?? raw.is_booster ?? quotaRaw.booster),
    },
  }
}

export function formatSaveSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
