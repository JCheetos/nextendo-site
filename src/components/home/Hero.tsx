import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

export async function Hero() {
  const t = await getTranslations('hero')

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="shell hero__grid">
        <div className="hero__copy">
          <p className="status" data-reveal>
            <span className="status__dot" aria-hidden="true" />
            <span>{t('status')}</span>
          </p>

          <h1 className="hero__title" id="hero-title" data-reveal>
            {t.rich('title', {
              hl: (chunks) => <span className="hl">{chunks}</span>,
            })}
          </h1>

          <p className="hero__lede" data-reveal>
            {t('lede')}
          </p>

          <div className="hero__cta" data-reveal>
            <Link className="btn btn--primary" href="/register">
              <span>{t('cta1')}</span>
              <i className="ph ph-arrow-right" aria-hidden="true" />
            </Link>
            <Link className="btn btn--ghost" href="#install">
              {t('cta2')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
