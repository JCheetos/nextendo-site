export type ProgressDetail =
  | 'luigis-mansion-3'
  | 'mario-kart'
  | 'splatoon-2'
  | 'smash'
  | 'animal-crossing'
  | 'mario-strikers'
  | 'minecraft'
  | 'mario-party'
  | 'splatoon-3'
  | 'mario-maker-2'

export const GAMES = [
  { name: "Luigi's Mansion 3", pct: 100, detail: 'luigis-mansion-3' },
  { name: 'Mario Kart 8 Deluxe', pct: 91, detail: 'mario-kart' },
  { name: 'Splatoon 2', pct: 87, detail: 'splatoon-2' },
  { name: 'Super Smash Bros. Ultimate', pct: 84, detail: 'smash' },
  { name: 'Animal Crossing: New Horizons', pct: 73, detail: 'animal-crossing' },
  { name: 'Mario Strikers: Battle League', pct: 56, detail: 'mario-strikers' },
  { name: 'Minecraft', pct: 51, detail: 'minecraft' },
  { name: 'Mario Party Jamboree', pct: 45, detail: 'mario-party' },
  { name: 'Splatoon 3', pct: 58, detail: 'splatoon-3' },
  { name: 'Super Mario Maker 2', pct: 16, detail: 'mario-maker-2' },
] as const satisfies readonly { name: string; pct: number; detail: ProgressDetail }[]
