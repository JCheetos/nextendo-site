import { getTranslations } from 'next-intl/server'

const FIGURES = [
  { n: '3', key: 'fig1' },
  { n: '1', key: 'fig2' },
  { n: '100\u00a0%', key: 'fig3' },
  { n: '0\u00a0€', key: 'fig4' },
] as const

export async function Figures() {
  const t = await getTranslations()
  return (
    <section className="section section--tight shell" aria-label={t('figures.ariaLabel')}>
      <div className="figures">
        {FIGURES.map((fig) => (
          <div key={fig.key} className="figure">
            <span className="figure__n mono">{fig.n}</span>
            <span className="figure__l">{t(`${fig.key}.l`)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
