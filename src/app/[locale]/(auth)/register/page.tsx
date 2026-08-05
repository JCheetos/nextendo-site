import { AuthShell } from '@/components/auth/AuthShell'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { AuthHeader } from '@/components/layout/AuthHeader'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Link from 'next/link'

export async function generateMetadata() {
  const t = await getTranslations('register')
  return { title: t('metaTitle'), description: t('metaDesc'), robots: { index: false } }
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('register')
  const tMember = await getTranslations('member')
  const tNav = await getTranslations('nav')

  return (
    <>
      <AuthHeader primaryHref="/login" primaryLabel={tNav('login')} />
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
                    {t.rich('point2', {
                      em: (chunks) => <em>{chunks}</em>,
                    })}
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
                    <span className="member-card__chip">{t('chip')}</span>
                  </div>
                  <div className="member-card__label">{tMember('label')}</div>
                  <div className="member-card__code">SW-••••-••••-••••</div>
                  <div className="member-card__foot">
                    <div className="member-card__name" id="preview-name">
                      {t('previewName')}
                      <span>{tMember('pseudo')}</span>
                    </div>
                    <div className="member-card__sig" aria-hidden="true" />
                  </div>
                </div>
              </>
            }
          >
            <h2>{t('cardTitle')}</h2>
            <p className="sub">{t('cardSub')}</p>
            <RegisterForm locale={locale} />
            <div className="auth__foot">
              <span>{t('footText')}</span> <Link href="/login">{t('footLink')}</Link>
            </div>
          </AuthShell>
        </div>
      </main>
    </>
  )
}
