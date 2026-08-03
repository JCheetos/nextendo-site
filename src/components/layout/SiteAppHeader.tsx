import { LogoutButton } from '@/components/dashboard/LogoutButton'
import { getLocale, getTranslations } from 'next-intl/server'
import Link from 'next/link'

export async function SiteAppHeader() {
  const t = await getTranslations('nav')
  const locale = await getLocale()

  return (
    <header className="nav" id="nav">
      <div className="shell nav__inner">
        <Link className="brand" href="/" aria-label={t('home')}>
          <img className="brand__mark" src="/favicon.svg" alt="" width={30} height={30} />
          <span className="brand__word">
            Nextendo<span className="brand__dim"> Network</span>
          </span>
        </Link>

        <div className="nav__end">
          <Link className="ghost-link" href="/">
            <i className="ph ph-house" aria-hidden="true" />
            <span>{t('home')}</span>
          </Link>
          <LogoutButton locale={locale} />
        </div>
      </div>
    </header>
  )
}
