import { fetchOnlineCounts } from '@/lib/api'
import { aggregate, computeStatuses, formatStamp, totalPlayers } from '@/lib/status'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

const SITE_URL = 'https://nextendo.network'

// Status is live: skip SSG (the Go backend isn't reachable at build time).
// The 15s revalidate in fetchOnlineCounts handles the cache layer.
export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'status' })
  return {
    title: t('metaTitle'),
    description: t('metaDesc'),
    alternates: { canonical: `${SITE_URL}/status` },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDesc'),
      url: `${SITE_URL}/status`,
    },
  }
}

export default async function StatusPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('status')

  const payload = await fetchOnlineCounts()
  const statuses = computeStatuses(payload)
  const total = totalPlayers(statuses)
  const agg = aggregate(statuses)
  const isUp = (s: boolean) => (s ? t('online') : t('offline'))

  const banner = {
    up: { title: t('allUp'), sub: t('allUpSub') },
    partial: {
      title: t('partial'),
      sub: `${statuses.length - statuses.filter((g) => g.up).length} / ${statuses.length} ${t('partialSub')}`,
    },
    down: { title: t('allDown'), sub: t('allDownSub') },
    unknown: { title: t('unreachable'), sub: t('unreachableSub') },
  }[agg]

  return (
    <section className="section shell statuspage" aria-labelledby="status-title">
      <header className="head head--left">
        <h1 className="head__title" id="status-title">
          {t('title')}
        </h1>
        <p className="head__lede">{t('lede')}</p>
      </header>

      <div
        className={`status-banner ${
          agg === 'up'
            ? 'is-up'
            : agg === 'partial'
              ? 'is-partial'
              : agg === 'down'
                ? 'is-down'
                : ''
        }`}
        id="status-banner"
      >
        <span className="status-banner__dot" />
        <div>
          <div className="status-banner__title" id="status-banner-title">
            {banner.title}
          </div>
          <div className="status-banner__sub" id="status-banner-sub">
            {banner.sub}
          </div>
        </div>
      </div>

      <div className="status-grid" id="status-grid" aria-live="polite">
        {statuses.map((g) => (
          <div key={g.name} className={`status-row ${g.up ? 'is-up' : 'is-down'}`}>
            <span className="status-row__dot" />
            <span className="status-row__name">{g.name}</span>
            <span className="status-row__state">{isUp(g.up)}</span>
            <span className="status-row__players">
              {g.up ? `${g.players} ${g.players === 1 ? t('player') : t('players')}` : '—'}
            </span>
          </div>
        ))}
      </div>

      <div className="status-total">
        <span className="status-total__lbl">{t('totalLabel')}</span>
        <span className="status-total__n" id="status-total">
          {total.toLocaleString(locale)}
        </span>
      </div>

      <p className="status-updated" id="status-updated">
        {payload ? `${t('updated')} ${formatStamp(new Date(), locale)}` : t('unreachableSub')}
      </p>
    </section>
  )
}
