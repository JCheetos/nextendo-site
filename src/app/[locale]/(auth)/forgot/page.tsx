import { AuthShell } from '@/components/auth/AuthShell'
import { ForgotForm } from '@/components/auth/ForgotForm'
import { AuthHeader } from '@/components/layout/AuthHeader'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

export async function generateMetadata() {
  const t = await getTranslations('forgot')
  return { title: t('metaTitle'), description: t('metaDesc'), robots: { index: false } }
}

export default async function ForgotPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('forgot')
  const tNav = await getTranslations('nav')

  return (
    <>
      <AuthHeader
        primaryHref="/register"
        primaryLabel={tNav('register')}
        secondaryHref="/login"
        secondaryLabel={tNav('login')}
      />
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
              </>
            }
          >
            <h2>{t('cardTitle')}</h2>
            <p className="sub">{t('cardSub')}</p>
            <ForgotForm locale={locale} />
            <div className="auth__foot">
              <span>{t('footText')}</span> <Link href="/login">{t('footLink')}</Link>
            </div>
          </AuthShell>
        </div>
      </main>
    </>
  )
}
