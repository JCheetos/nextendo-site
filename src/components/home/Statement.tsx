import { getTranslations } from 'next-intl/server'

export async function Statement() {
  const t = await getTranslations()
  return (
    <section className="statement shell" aria-label={t('statement.ariaLabel')}>
      <p className="statement__text">
        {t.rich('statement.text', {
          soft: (chunks) => <span className="statement__soft">{chunks}</span>,
        })}
      </p>
    </section>
  )
}
