import { describe, expect, it } from 'vitest'
import { formatSaveSize, normalizeSavesResponse } from './saves'

describe('cloud save normalization', () => {
  it('accepts upstream snake_case fields and quota metadata', () => {
    expect(
      normalizeSavesResponse({
        saves: [{ title_id: '0100', name: 'Demo', size_bytes: 2048, updated_at: '2026-01-01' }],
        quota: { used_bytes: 2048, limit_bytes: 4096 },
        is_booster: true,
      }),
    ).toEqual({
      saves: [{ titleId: '0100', title: 'Demo', size: 2048, updatedAt: '2026-01-01' }],
      quota: { used: 2048, limit: 4096, booster: true },
    })
  })

  it('drops malformed entries and supports an array response', () => {
    expect(normalizeSavesResponse([{ titleId: 'ok' }, { name: 'missing id' }]).saves).toEqual([
      { titleId: 'ok', title: 'ok', size: 0 },
    ])
  })

  it('formats bytes without exposing raw binary data', () => {
    expect(formatSaveSize(1024 * 1024)).toBe('1.0 MB')
  })
})
