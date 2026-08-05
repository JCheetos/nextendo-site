import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { fetchLatestRelease, formatSize, releasesUrl } from '@/lib/github'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

const PLATFORMS = [
  { key: 'win', icon: 'ph-windows-logo', name: 'Windows', ext: '.zip' },
  { key: 'linux', icon: 'ph-linux-logo', name: 'Linux', ext: '.tar.gz' },
  {
    key: 'mac',
    icon: 'ph-apple-logo',
    name: 'macOS',
    ext: 'universal · .tar.gz',
  },
] as const

const SITE_URL = 'https://nextendo.network'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'download' })
  return {
    title: t('metaTitle'),
    description: t('metaDesc'),
    alternates: { canonical: `${SITE_URL}/telecharger` },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDesc'),
      url: `${SITE_URL}/telecharger`,
    },
  }
}

export default async function TelechargerPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('download')
  const release = await fetchLatestRelease()

  const version = release.tag
    ? `${t('version')} ${release.tag}`
    : release.anyFound
      ? t('version')
      : t('fallbackVersion')

  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        <section className="section shell dlpage" aria-labelledby="download-title">
          <header className="head head--left">
            <h1 className="head__title" id="download-title">
              {t('title')}
            </h1>
            <p className="head__lede">{t('lede')}</p>
          </header>

          <div className="dl-version">{version}</div>

          <div className="dl-grid">
            {PLATFORMS.map((p) => {
              const asset = release.assets[p.key]
              const href = asset?.url ?? releasesUrl
              const size = asset ? formatSize(asset.size) : ''
              const isDirect = Boolean(asset)
              return (
                <a
                  key={p.key}
                  className="dl-card"
                  data-platform={p.key}
                  href={href}
                  {...(isDirect ? { download: '' } : { target: '_blank', rel: 'noopener' })}
                >
                  <i className={`ph ${p.icon} dl-card__icon`} aria-hidden="true" />
                  <span className="dl-card__os">{p.name}</span>
                  <span className="dl-card__meta">
                    {p.ext} {size && <span className="dl-card__size">{size}</span>}
                  </span>
                  <span className="dl-card__btn">
                    <i className="ph ph-download-simple" aria-hidden="true" /> {t('button')}
                  </span>
                </a>
              )
            })}
          </div>

          <p className="dl-fallback" id="dl-fallback" hidden={release.anyFound}>
            <a href={releasesUrl} target="_blank" rel="noreferrer noopener">
              {t('fallback')}
            </a>
          </p>

          <div className="dl-note">
            <h3>{t('switch.h')}</h3>
            <p>{t('switch.p')}</p>
            <a
              className="btn btn--ghost btn--sm"
              href="https://discord.gg/XPfeCMwnzQ"
              target="_blank"
              rel="noreferrer noopener"
            >
              <i className="ph ph-discord-logo" aria-hidden="true" /> {t('switch.cta')}
            </a>
          </div>

          <p className="dl-legal">{t('legal')}</p>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
