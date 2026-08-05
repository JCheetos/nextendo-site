import { LangSwitcher } from '@/components/layout/LangSwitcher'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

type Props = {
  primaryHref?: string
  primaryLabel?: string
  secondaryHref?: string
  secondaryLabel?: string
}

export async function AuthHeader({
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: Props) {
  const t = await getTranslations('nav')

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
          <LangSwitcher />
          <Link className="ghost-link" href="/">
            {t('home')}
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link className="ghost-link" href={secondaryHref}>
              {secondaryLabel}
            </Link>
          ) : null}
          {primaryHref && primaryLabel ? (
            <Link className="btn btn--soft btn--sm" href={primaryHref}>
              {primaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  )
}
