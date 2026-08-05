import { AuthShell } from '@/components/auth/AuthShell'
import { ResetForm } from '@/components/auth/ResetForm'
import { AuthHeader } from '@/components/layout/AuthHeader'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

type SearchParams = Promise<{ token?: string }>

export async function generateMetadata() {
  const t = await getTranslations('reset')
  return { title: t('metaTitle'), robots: { index: false } }
}

export default async function ResetPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: SearchParams
}) {
  const { locale } = await params
  const { token } = await searchParams
  const t = await getTranslations('reset')
  const tNav = await getTranslations('nav')

  return (
    <>
      <AuthHeader secondaryHref="/login" secondaryLabel={tNav('login')} />
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
                </div>
              </>
            }
          >
            <h2>{t('cardTitle')}</h2>
            <p className="sub">{t('cardSub')}</p>
            <ResetForm locale={locale} token={token ?? ''} />
            <div className="auth__foot">
              <Link href="/login">{t('footLink')}</Link>
            </div>
          </AuthShell>
        </div>
      </main>
    </>
  )
}
