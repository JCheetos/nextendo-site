import { Architecture } from '@/components/home/Architecture'
import { CTA } from '@/components/home/CTA'
import { FAQ } from '@/components/home/FAQ'
import { Features } from '@/components/home/Features'
import { Figures } from '@/components/home/Figures'
import { Hero } from '@/components/home/Hero'
import { Install } from '@/components/home/Install'
import { Progress } from '@/components/home/Progress'
import { Statement } from '@/components/home/Statement'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

const SITE_URL = 'https://nextendo.network'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'index' })
  return {
    title: t('metaTitle'),
    description: t('metaDesc'),
  }
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  // SoftwareApplication + Organization JSON-LD. Single block, locale-agnostic.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'Nextendo Network',
        url: SITE_URL,
        logo: `${SITE_URL}/favicon.svg`,
        sameAs: ['https://github.com/NextendoNetwork', 'https://discord.gg/XPfeCMwnzQ'],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: 'Nextendo Network',
        publisher: { '@id': `${SITE_URL}/#organization` },
        inLanguage: locale,
      },
      {
        '@type': 'SoftwareApplication',
        name: 'Ryujinx — Nextendo Network fork',
        applicationCategory: 'GameApplication',
        applicationSubCategory: 'Nintendo Switch Emulator',
        operatingSystem: 'Windows, macOS, Linux',
        description:
          'A free, open-source Nintendo Switch emulator focusing on performance, stability, and a friendly online play network.',
        url: `${SITE_URL}/telecharger`,
        downloadUrl: `${SITE_URL}/telecharger`,
        softwareVersion: 'latest',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
    ],
  }

  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        <span id="top" />
        <Hero />
        <Statement />
        <Features />
        <Architecture />
        <Install />
        <Figures />
        <Progress />
        <FAQ />
        <CTA />
      </main>
      <SiteFooter />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted JSON-LD blob.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  )
}
