import { CopyButton } from '@/components/dashboard/CopyButton'
import type { Account } from '@/lib/api'
import { countryFlag, countryName } from '@/lib/countries'
import { getLocale, getTranslations } from 'next-intl/server'

type Props = {
  account: Account
}

export async function IdentityPanel({ account }: Props) {
  const t = await getTranslations('acc')
  const tMember = await getTranslations('member')
  const tForm = await getTranslations('form')
  const locale = await getLocale()

  const isGuest = (account.email ?? '').toLowerCase().endsWith('@nextendo.local')
  const email = isGuest ? t('guestEmail') : (account.email ?? '—')
  const friendCode = account.friend_code ?? ''

  const dateFmt = new Intl.DateTimeFormat(
    {
      fr: 'fr-FR',
      en: 'en-US',
      es: 'es-ES',
      pt: 'pt-BR',
      de: 'de-DE',
      it: 'it-IT',
      ru: 'ru-RU',
      zh: 'zh-CN',
      ja: 'ja-JP',
      ar: 'ar',
    }[locale] ?? 'fr-FR',
    { year: 'numeric', month: 'long', day: 'numeric' },
  )
  let since = '—'
  const createdAt = account.created_at as string | undefined
  if (createdAt) {
    const d = new Date(createdAt)
    if (!Number.isNaN(d.getTime())) since = dateFmt.format(d)
  }

  return (
    <div className="panel">
      <div className="panel__h">
        <h2>{t('identity')}</h2>
        <i className="ph ph-identification-card" aria-hidden="true" />
      </div>
      <div className="kv">
        <Row label={t('pseudo')}>
          <span>{(account.username as string | undefined) ?? '—'}</span>
        </Row>
        <Row label={tMember('label')}>
          <span className="inline-copy">
            <span className="mono">{friendCode || '—'}</span>
            {friendCode ? <CopyButton value={friendCode} label={t('copy')} /> : null}
          </span>
        </Row>
        <Row label={t('pid')}>
          <span className="mono">{(account.pid as string | undefined) ?? '—'}</span>
        </Row>
        <Row label={tForm('email')}>
          <span>
            {email}{' '}
            {account.email_verified ? (
              <span className="email-chip ok">✓</span>
            ) : isGuest ? null : (
              <span className="email-chip no">!</span>
            )}
          </span>
        </Row>
        <Row label={t('country')}>
          <span>
            {account.country
              ? `${countryFlag(account.country)} ${countryName(account.country, locale) ?? account.country}`
              : '—'}
          </span>
        </Row>
        <Row label={t('discord')}>
          <DiscordCell account={account} noDiscord={t('noDiscord')} linkLabel={t('linkDiscord')} />
        </Row>
        <Row label={t('memberSince')}>
          <span>{since}</span>
        </Row>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="kv__row">
      <span className="kv__k">{label}</span>
      <span className="kv__v">{children}</span>
    </div>
  )
}

function DiscordCell({
  account,
  noDiscord,
  linkLabel,
}: {
  account: Account
  noDiscord: string
  linkLabel: string
}) {
  const discord = account.discord as string | undefined
  const linkedAt = account.discord_linked_at as string | undefined
  if (discord) {
    return (
      <span className="mono">
        {discord}
        {linkedAt ? (
          <span className="email-chip ok" style={{ marginInlineStart: '0.4rem' }}>
            {new Date(linkedAt).toLocaleDateString()}
          </span>
        ) : null}
      </span>
    )
  }
  return (
    <span style={{ opacity: 0.7 }}>
      {noDiscord}{' '}
      <a
        className="ghost-link"
        href="https://discord.gg/XPfeCMwnzQ"
        target="_blank"
        rel="noreferrer noopener"
        style={{ fontSize: '0.8rem' }}
      >
        <i className="ph ph-discord-logo" aria-hidden="true" /> {linkLabel}
      </a>
    </span>
  )
}
