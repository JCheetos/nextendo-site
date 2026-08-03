import { LangSwitcher } from '@/components/layout/LangSwitcher'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

export async function SiteHeader() {
  const t = await getTranslations('nav')

  const links: ReadonlyArray<{ href: string; label: string; current?: boolean }> = [
    { href: '/#features', label: t('features') },
    { href: '/#architecture', label: t('architecture') },
    { href: '/telecharger', label: t('download') },
    { href: '/status', label: t('status') },
    { href: '/#faq', label: t('faq') },
  ]

  return (
    <header className="nav" id="nav">
      <div className="shell nav__inner">
        <Link className="brand" href="/" aria-label={t('home')}>
          <img className="brand__mark" src="/favicon.svg" alt="" width={30} height={30} />
          <span className="brand__word">
            Nextendo<span className="brand__dim"> Network</span>
          </span>
        </Link>

        <nav className="nav__links" id="navlinks" aria-label={t('mainNav')}>
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="nav__end">
          <LangSwitcher />
          <a
            className="ghost-link ghost-link--icon"
            href="https://github.com/NextendoNetwork"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="GitHub"
          >
            <i className="ph ph-github-logo" aria-hidden="true" />
          </a>
          <a
            className="ghost-link ghost-link--icon"
            href="https://discord.gg/XPfeCMwnzQ"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Discord"
          >
            <i className="ph ph-discord-logo" aria-hidden="true" />
          </a>
          <Link className="ghost-link" href="/login">
            <i className="ph ph-sign-in" aria-hidden="true" />
            <span>{t('login')}</span>
          </Link>
          <Link className="btn btn--primary btn--sm" href="/register">
            {t('register')}
          </Link>
          <button
            className="burger"
            id="burger"
            type="button"
            aria-label={t('openMenu')}
            aria-expanded="false"
            aria-controls="navlinks"
          >
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  )
}
