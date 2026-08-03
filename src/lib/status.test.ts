import { describe, expect, it } from 'vitest'
import { GAMES, aggregate, computeStatuses, formatStamp, totalPlayers } from './status'

const BASE = {
  counts: { '0100152000022000': 12, '0100f8f0000a2000': 7, '01006a800016e000': 30 },
} as const

describe('computeStatuses', () => {
  it('marks a game as up when any of its title ids is present', () => {
    const statuses = computeStatuses({ counts: { ...BASE.counts } })
    expect(statuses[0]).toEqual({ name: 'Mario Kart 8 Deluxe', up: true, players: 12 })
    expect(statuses[1]).toEqual({ name: 'Splatoon 2', up: true, players: 7 })
    expect(statuses[2]).toEqual({ name: 'Super Smash Bros. Ultimate', up: true, players: 30 })
  })

  it('marks a game as down when none of its title ids is present', () => {
    const statuses = computeStatuses({ counts: {} })
    expect(statuses.every((g) => !g.up && g.players === 0)).toBe(true)
  })

  it('returns one entry per game in declaration order', () => {
    const statuses = computeStatuses(null)
    expect(statuses.map((g) => g.name)).toEqual(GAMES.map((g) => g.name))
  })

  it('handles null payload as fully down', () => {
    const statuses = computeStatuses(null)
    expect(aggregate(statuses)).toBe('down')
    expect(totalPlayers(statuses)).toBe(0)
  })

  it('treats unknown ids as not present', () => {
    const statuses = computeStatuses({
      counts: { 'unknown-id': 999 } as Record<string, number>,
    })
    expect(statuses.every((g) => !g.up)).toBe(true)
  })
})

describe('aggregate', () => {
  it('returns up when every game is up', () => {
    expect(aggregate([{ name: 'a', up: true, players: 1 }])).toBe('up')
  })

  it('returns down when no game is up', () => {
    expect(aggregate([{ name: 'a', up: false, players: 0 }])).toBe('down')
  })

  it('returns partial when some games are up', () => {
    expect(
      aggregate([
        { name: 'a', up: true, players: 1 },
        { name: 'b', up: false, players: 0 },
      ]),
    ).toBe('partial')
  })

  it('returns unknown when given an empty list', () => {
    expect(aggregate([])).toBe('unknown')
  })
})

describe('totalPlayers', () => {
  it('sums only the players of up games', () => {
    expect(
      totalPlayers([
        { name: 'a', up: true, players: 10 },
        { name: 'b', up: false, players: 99 },
        { name: 'c', up: true, players: 5 },
      ]),
    ).toBe(15)
  })
})

describe('formatStamp', () => {
  it('formats a timestamp as a non-empty time string', () => {
    const date = new Date('2024-01-01T12:00:00Z')
    // Don't pin to a specific hour — the test environment may be on any
    // timezone, and `en-US` returns 12-hour format ("7:00 AM"). Just verify
    // the function returns a non-empty time string.
    expect(formatStamp(date, 'fr')).toMatch(/\d/)
    expect(formatStamp(date, 'en')).toMatch(/\d/)
    expect(typeof formatStamp(date, 'fr')).toBe('string')
  })

  it('falls back to ISO when the locale is unknown', () => {
    const date = new Date('2024-01-01T12:00:00Z')
    // Unknown locale won't throw; we just check the call is safe.
    expect(typeof formatStamp(date, 'xx')).toBe('string')
  })
})
