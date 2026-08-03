import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

export async function SiteFooter() {
  const t = await getTranslations('footer')
  const nav = await getTranslations('nav')
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="shell footer__grid">
        <div className="footer__brand">
          <Link className="brand" href="/" aria-label={nav('home')}>
            <img className="brand__mark" src="/favicon.svg" alt="" width={28} height={28} />
            <span className="brand__word">
              Nextendo<span className="brand__dim"> Network</span>
            </span>
          </Link>
          <p className="footer__tag">{t('tag')}</p>
        </div>

        <nav className="footer__cols" aria-label={t('colsAria')}>
          <div>
            <h4>{t('project')}</h4>
            <Link href="/#features">{nav('features')}</Link>
            <Link href="/telecharger">{nav('download')}</Link>
            <Link href="/#install">{nav('install')}</Link>
          </div>
          <div>
            <h4>{t('community')}</h4>
            <a href="https://github.com/NextendoNetwork" target="_blank" rel="noreferrer noopener">
              GitHub
            </a>
            <a href="https://discord.gg/XPfeCMwnzQ" target="_blank" rel="noreferrer noopener">
              Discord
            </a>
            <Link href="/#faq">{nav('faq')}</Link>
          </div>
          <div>
            <h4>{t('status')}</h4>
            <Link href="/status">
              <span className="status status--mini">
                <span className="status__dot" aria-hidden="true" />
                <span>{t('operational')}</span>
              </span>
            </Link>
          </div>
        </nav>
      </div>

      <div className="shell footer__legal">
        <p>{t('legal')}</p>
        <p className="footer__copy">
          © {year} {t('rights')}
        </p>
      </div>
    </footer>
  )
}
