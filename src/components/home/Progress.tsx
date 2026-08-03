import { getTranslations } from 'next-intl/server'

const GAMES = [
  { name: 'Mario Kart 8 Deluxe', pct: 91, detail: 'courses' },
  { name: 'Splatoon 2', pct: 87, detail: 'turf' },
  { name: 'Super Smash Bros. Ultimate', pct: 84, detail: 'arenas' },
  { name: 'Animal Crossing: New Horizons', pct: 73, detail: 'islands' },
  { name: 'Mario Strikers: Battle League', pct: 56, detail: 'clubs' },
  { name: 'Minecraft', pct: 51, detail: 'servers' },
  { name: 'Mario Party Jamboree', pct: 34, detail: 'launch' },
  { name: 'Splatoon 3', pct: 27, detail: 'launch' },
  { name: 'Super Mario Maker 2', pct: 16, detail: 'wip' },
] as const

export async function Progress() {
  const t = await getTranslations()

  const sum = GAMES.reduce((acc, g) => acc + g.pct, 0)
  const overall = Math.round(sum / GAMES.length)

  return (
    <section className="section shell" id="progress" aria-labelledby="progress-title">
      <header className="head head--left">
        <h2 className="head__title" id="progress-title">
          {t('progress.title')}
        </h2>
        <p className="head__lede">{t('progress.lede')}</p>
      </header>
      <div className="progress">
        <div
          className="progress__ring"
          id="progress-ring"
          style={{ ['--p' as string]: String(overall) }}
        >
          <span className="progress__pct" id="progress-pct">
            {overall}%
          </span>
        </div>
        <div className="progress__list" id="progress-list">
          {GAMES.map((g) => {
            const done = g.pct >= 100
            return (
              <div key={g.name} className={`progress-item${done ? ' is-done' : ''}`}>
                {done ? (
                  <i className="ph ph-check-circle progress-item__ic" aria-hidden="true" />
                ) : (
                  <span className="progress-item__ic">
                    <span className="progress-item__dot" />
                  </span>
                )}
                <div className="progress-item__main">
                  <span className="progress-item__name">{g.name}</span>
                  <span className="progress-item__detail">
                    {t(`progress.chart.${g.detail}.detail`)}
                  </span>
                </div>
                <span className="progress-item__pct">[{g.pct}%]</span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
