import { AccountShell } from '@/components/dashboard/AccountShell'
import { SiteAppHeader } from '@/components/layout/SiteAppHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import type { locales } from '@/i18n/config'
import { isLocale } from '@/i18n/config'
import { fetchMe } from '@/lib/api'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

// `/compte` is auth-gated: the cookie is HttpOnly so we must check on each
// request. force-dynamic opts out of SSG and the locale variants don't matter
// once the user is redirected.
export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getTranslations('acc')
  return { title: t('metaTitle'), description: t('securityIntro'), robots: { index: false } }
}

type Params = { locale: string }

export default async function ComptePage({ params }: { params: Promise<Params> }) {
  const { locale: rawLocale } = await params
  if (!isLocale(rawLocale)) {
    redirect('/compte')
  }
  const locale = rawLocale as (typeof locales)[number]
  setRequestLocale(locale)

  const account = await fetchMe()
  if (!account) {
    redirect(`/login?next=${encodeURIComponent('/compte')}`)
  }

  const isAdmin = Boolean((account as { is_admin?: boolean }).is_admin)

  return (
    <>
      <SiteAppHeader />
      <main id="main" tabIndex={-1}>
        <div className="shell">
          <AccountShell account={account} locale={locale} isAdmin={isAdmin} />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
