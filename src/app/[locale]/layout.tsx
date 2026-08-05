import { Backdrop } from '@/components/layout/Backdrop'
import { SiteEffects } from '@/components/layout/SiteEffects'
import { locales } from '@/i18n/config'
import type { Metadata } from 'next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { Bricolage_Grotesque, JetBrains_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

const SITE_URL = 'https://nextendo.network'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bricolage',
  weight: ['400', '500', '600', '700', '800'],
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
  weight: ['400', '500', '600'],
})

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'index' })

  // The browser URL stays clean (no /<locale>/ prefix); next-intl rewrites
  // internally. hreflang + canonical point at the unprefixed URL.
  const canonical = `${SITE_URL}/`
  const languages: Record<string, string> = {}
  for (const l of locales) {
    languages[l] = `${SITE_URL}/`
  }
  languages['x-default'] = `${SITE_URL}/`

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t('metaTitle'),
      template: '%s — Nextendo Network',
    },
    description: t('metaDesc'),
    applicationName: 'Nextendo Network',
    authors: [{ name: 'Nextendo Network' }],
    generator: 'Next.js',
    keywords: ['Nextendo', 'Ryujinx', 'Nintendo Switch', 'emulator', 'Nextendo Network'],
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      type: 'website',
      siteName: 'Nextendo Network',
      title: t('metaTitle'),
      description: t('metaDesc'),
      url: canonical,
      locale: ogLocale(locale),
      images: [
        {
          url: '/favicon.svg',
          width: 512,
          height: 512,
          alt: 'Nextendo Network',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('metaTitle'),
      description: t('metaDesc'),
      images: ['/favicon.svg'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
    },
  }
}

function ogLocale(locale: string): string {
  // Open Graph expects BCP-47 language tags like `fr_FR`, `en_US`.
  const map: Record<string, string> = {
    fr: 'fr_FR',
    en: 'en_US',
    es: 'es_ES',
    pt: 'pt_BR',
    de: 'de_DE',
    it: 'it_IT',
    ru: 'ru_RU',
    zh: 'zh_CN',
    ja: 'ja_JP',
    ar: 'ar_SA',
  }
  return map[locale] ?? 'en_US'
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(locales, locale)) notFound()
  setRequestLocale(locale)
  const messages = (await getMessages()) as { a11y?: { skip?: string } }
  const skipLabel = messages.a11y?.skip ?? 'Skip to content'

  return (
    <html
      lang={locale}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className={`${bricolage.variable} ${jetbrains.variable}`}
    >
      <body className="js">
        <NextIntlClientProvider messages={messages}>
          <a href="#main" className="skip-link">
            {skipLabel}
          </a>
          <Backdrop />
          <SiteEffects />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
