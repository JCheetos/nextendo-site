import { AuthShell } from '@/components/auth/AuthShell'
import { LoginForm } from '@/components/auth/LoginForm'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

type SearchParams = Promise<{ next?: string }>

export async function generateMetadata() {
  const t = await getTranslations('login')
  return { title: t('metaTitle'), description: t('metaDesc') }
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: SearchParams
}) {
  const { locale } = await params
  const { next } = await searchParams
  const t = await getTranslations('login')
  const tNav = await getTranslations('nav')

  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        <div className="shell">
          <AuthShell
            aside={
              <>
                <span className="auth__tag">
                  <span className="status__dot" aria-hidden="true" /> {t('tag')}
                </span>
                <h1 className="auth__title">{t('asideTitle')}</h1>
                <p className="auth__lede">{t('asideLede')}</p>
                <div className="auth__points">
                  <div className="auth__point">
                    <span className="ck">
                      <i className="ph ph-check" aria-hidden="true" />
                    </span>{' '}
                    {t('point1')}
                  </div>
                  <div className="auth__point">
                    <span className="ck">
                      <i className="ph ph-check" aria-hidden="true" />
                    </span>{' '}
                    {t('point2')}
                  </div>
                  <div className="auth__point">
                    <span className="ck">
                      <i className="ph ph-check" aria-hidden="true" />
                    </span>{' '}
                    {t('point3')}
                  </div>
                </div>
                <div className="member-card" style={{ marginTop: '1.8rem', maxWidth: '24rem' }}>
                  <div className="member-card__top">
                    <span className="member-card__brand">
                      <img src="/favicon.svg" alt="" width={18} height={18} />
                      NEXTENDO
                    </span>
                    <span className="member-card__chip">{tNav('home')}</span>
                  </div>
                  <div className="member-card__label">{tNav('install')}</div>
                  <div className="member-card__code">SW-4815-1623-0842</div>
                  <div className="member-card__foot">
                    <div className="member-card__name">
                      Inkling_Pro<span>{t('asideTitle')}</span>
                    </div>
                    <div className="member-card__sig" aria-hidden="true" />
                  </div>
                </div>
              </>
            }
          >
            <h2>{t('cardTitle')}</h2>
            <p className="sub">{t('cardSub')}</p>
            <LoginForm locale={locale} next={next ?? null} />
            <div className="auth__foot">
              <span>{t('footText')}</span> <Link href="/register">{t('footLink')}</Link>
            </div>
          </AuthShell>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
