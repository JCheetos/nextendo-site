import { describe, expect, it } from 'vitest'
import { GAMES } from './progress-data'

describe('home progress data', () => {
  it('keeps games sorted from highest to lowest completion', () => {
    expect(GAMES.map((game) => game.pct)).toEqual(
      [...GAMES.map((game) => game.pct)].sort((a, b) => b - a),
    )
  })

  it('contains the upstream progress updates', () => {
    expect(GAMES[0]).toMatchObject({ name: "Luigi's Mansion 3", pct: 100, detail: 'luigi' })
    expect(GAMES.find((game) => game.name === 'Mario Party Jamboree')).toMatchObject({ pct: 45 })
    expect(Math.round(GAMES.reduce((sum, game) => sum + game.pct, 0) / GAMES.length)).toBe(63)
  })
})
