import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

export async function CTA() {
  const t = await getTranslations()
  return (
    <section className="section shell" aria-labelledby="cta-title">
      <div className="cta">
        <div className="cta__field" aria-hidden="true" />
        <h2 id="cta-title">{t('cta.title')}</h2>
        <p>{t('cta.lede')}</p>
        <div className="cta__actions">
          <Link className="btn btn--primary" href="/register">
            {t('cta.b1')}
          </Link>
          <Link className="btn btn--ghost" href="/login">
            {t('cta.b2')}
          </Link>
        </div>
      </div>
    </section>
  )
}
