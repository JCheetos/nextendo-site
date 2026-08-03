import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { verifyAction } from '@/server/auth'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

type SearchParams = Promise<{ token?: string }>

export async function generateMetadata() {
  const t = await getTranslations('verify')
  return { title: t('metaTitle'), robots: { index: false } }
}

export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: SearchParams
}) {
  const { locale } = await params
  const { token } = await searchParams
  const t = await getTranslations('verify')
  const tErr = await getTranslations('auth.errors')

  const result = token ? await verifyAction({ token }) : ({ ok: false, error: 'unknown' } as const)
  const isOk = result.ok
  const errorKey = !isOk ? result.error : null

  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        <div className="shell">
          <section className="auth" style={{ justifyContent: 'center' }}>
            <div
              className="auth__card"
              style={{ maxWidth: '30rem', margin: '0 auto', textAlign: 'center' }}
            >
              <div
                className="modal__ic"
                style={{
                  fontSize: '2.9rem',
                  color: isOk ? 'var(--signal)' : 'oklch(0.70 0.17 25)',
                  lineHeight: 1,
                }}
              >
                <i className={`ph ${isOk ? 'ph-seal-check' : 'ph-x-circle'}`} aria-hidden="true" />
              </div>
              <h2>{isOk ? t('successTitle') : t('title')}</h2>
              <p className="sub" style={{ marginBottom: '1.3rem' }}>
                {isOk
                  ? t.raw('successMsg').replace('{email}', result.email ?? '')
                  : errorKey === 'unknown' || !errorKey
                    ? t('errNoToken')
                    : tErr(errorKey)}
              </p>
              <div id="v-actions">
                <Link
                  className="btn btn--primary btn--block btn--lg"
                  href={isOk ? `/${locale}/compte` : '/login'}
                >
                  {isOk ? t('ctaAccount') : t('ctaLogin')}{' '}
                  <i className="ph ph-arrow-right" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
