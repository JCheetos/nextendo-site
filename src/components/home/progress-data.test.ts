import { describe, expect, it } from 'vitest'
import { GAMES } from './progress-data'

describe('home progress data', () => {
  it('contains the upstream progress updates', () => {
    expect(GAMES.map((game) => game.pct)).toEqual([100, 91, 87, 84, 73, 56, 51, 45, 58, 16])
    expect(GAMES[0]).toMatchObject({
      name: "Luigi's Mansion 3",
      pct: 100,
      detail: 'luigis-mansion-3',
    })
    expect(GAMES.find((game) => game.name === 'Mario Party Jamboree')).toMatchObject({ pct: 45 })
    expect(GAMES.find((game) => game.name === 'Splatoon 3')).toMatchObject({
      pct: 58,
      detail: 'splatoon-3',
    })
    expect(Math.round(GAMES.reduce((sum, game) => sum + game.pct, 0) / GAMES.length)).toBe(66)
  })
})
