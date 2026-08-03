import { getTranslations } from 'next-intl/server'

const QUESTIONS = [
  { key: 'q1', openDefault: true },
  { key: 'q2', openDefault: false },
  { key: 'q3', openDefault: false },
  { key: 'q4', openDefault: false },
  { key: 'q5', openDefault: false },
] as const

export async function FAQ() {
  const t = await getTranslations()
  return (
    <section className="section shell" id="faq" aria-labelledby="faq-title">
      <header className="head head--left">
        <h2 className="head__title" id="faq-title">
          {t('faq.title')}
        </h2>
      </header>

      <div className="faq">
        {QUESTIONS.map((q) => (
          <details key={q.key} className="qa" {...(q.openDefault ? { open: true } : {})}>
            <summary>
              <span>{t(`faq.${q.key}`)}</span>
              <i className="ph ph-plus" aria-hidden="true" />
            </summary>
            <div className="qa__a">
              <p>{t(`faq.a${q.key.slice(1)}`)}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
