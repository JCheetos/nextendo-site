export type ProgressDetail =
  | 'courses'
  | 'turf'
  | 'arenas'
  | 'islands'
  | 'clubs'
  | 'servers'
  | 'launch'
  | 'luigi'
  | 'wip'

export const GAMES = [
  { name: "Luigi's Mansion 3", pct: 100, detail: 'luigi' },
  { name: 'Mario Kart 8 Deluxe', pct: 91, detail: 'courses' },
  { name: 'Splatoon 2', pct: 87, detail: 'turf' },
  { name: 'Super Smash Bros. Ultimate', pct: 84, detail: 'arenas' },
  { name: 'Animal Crossing: New Horizons', pct: 73, detail: 'islands' },
  { name: 'Mario Strikers: Battle League', pct: 56, detail: 'clubs' },
  { name: 'Minecraft', pct: 51, detail: 'servers' },
  { name: 'Mario Party Jamboree', pct: 45, detail: 'launch' },
  { name: 'Splatoon 3', pct: 27, detail: 'launch' },
  { name: 'Super Mario Maker 2', pct: 16, detail: 'wip' },
] as const satisfies readonly { name: string; pct: number; detail: ProgressDetail }[]
