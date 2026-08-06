import { SessionsPanel } from '@/components/dashboard/SessionsPanel'
import { SiteAppHeader } from '@/components/layout/SiteAppHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { isLocale, type locales } from '@/i18n/config'
import { fetchMe } from '@/lib/api'
import { getRequestCookieHeader } from '@/server/request'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

// `/sessions` is auth-gated and live (the list of devices changes after each
// login/logout). force-dynamic opts out of SSG; the auth check at the top
// runs on every request.
export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getTranslations('sess')
  return { title: t('metaTitle'), robots: { index: false } }
}

export default async function SessionsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  if (!isLocale(rawLocale)) {
    redirect('/sessions')
  }
  const locale = rawLocale as (typeof locales)[number]
  setRequestLocale(locale)

  const account = await fetchMe({ cookie: await getRequestCookieHeader() })
  if (!account) {
    redirect(`/login?next=${encodeURIComponent('/sessions')}`)
  }

  const t = await getTranslations('sess')

  return (
    <>
      <SiteAppHeader />
      <main id="main" tabIndex={-1}>
        <div className="shell">
          <section className="account">
            <div className="account__head">
              <div className="account__txt">
                <span className="account__live">
                  <span className="status__dot" aria-hidden="true" />
                  <span>{t('live')}</span>
                </span>
                <div className="account__hi">
                  <h1>{t('title')}</h1>
                </div>
              </div>
            </div>

            <SessionsPanel />
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
