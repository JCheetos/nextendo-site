// Pure helpers for the /status page. Total, sum, and reachable detection
// over the per-title count payload returned by the Go service.

import type { OnlineCounts } from './api'

export const GAMES = [
  { name: 'Mario Kart 8 Deluxe', ids: ['0100152000022000'] },
  {
    name: 'Splatoon 2',
    ids: ['0100f8f0000a2000', '01003bc0000a0000', '01003c700009c800'],
  },
  { name: 'Super Smash Bros. Ultimate', ids: ['01006a800016e000'] },
  { name: 'Animal Crossing: New Horizons', ids: ['01006f8002326000'] },
] as const

export type GameStatus = {
  name: string
  up: boolean
  players: number
}

export function computeStatuses(payload: OnlineCounts | null): GameStatus[] {
  const counts = payload?.counts ?? {}
  return GAMES.map((g) => {
    let players = 0
    let up = false
    for (const id of g.ids) {
      if (Object.prototype.hasOwnProperty.call(counts, id)) {
        up = true
        players = Number(counts[id]) || 0
        break
      }
    }
    return { name: g.name, up, players }
  })
}

export function totalPlayers(statuses: GameStatus[]): number {
  return statuses.reduce((sum, g) => sum + (g.up ? g.players : 0), 0)
}

export type Aggregate = 'up' | 'partial' | 'down' | 'unknown'

export function aggregate(statuses: GameStatus[]): Aggregate {
  if (statuses.length === 0) return 'unknown'
  const up = statuses.filter((g) => g.up).length
  if (up === statuses.length) return 'up'
  if (up === 0) return 'down'
  return 'partial'
}

export function formatStamp(date: Date, locale: string): string {
  try {
    const langs: Record<string, string> = {
      en: 'en-US',
      es: 'es-ES',
      pt: 'pt-BR',
      de: 'de-DE',
      it: 'it-IT',
      ru: 'ru-RU',
      zh: 'zh-CN',
      ja: 'ja-JP',
      ar: 'ar',
      fr: 'fr-FR',
    }
    const tag = langs[locale] ?? locale
    return date.toLocaleTimeString(tag)
  } catch {
    return date.toISOString()
  }
}
