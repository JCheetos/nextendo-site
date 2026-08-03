import { AccountHeader } from '@/components/dashboard/AccountHeader'
import { CalloutPlug } from '@/components/dashboard/CalloutPlug'
import { EditProfileTrigger } from '@/components/dashboard/EditProfileTrigger'
import { FriendsPanel } from '@/components/dashboard/FriendsPanel'
import { HistoryPanel } from '@/components/dashboard/HistoryPanel'
import { IdentityPanel } from '@/components/dashboard/IdentityPanel'
import { MemberCard } from '@/components/dashboard/MemberCard'
import { SecurityPanel } from '@/components/dashboard/SecurityPanel'
import { VerifyBanner } from '@/components/dashboard/VerifyBanner'
import type { Locale } from '@/i18n/config'
import type { Account } from '@/lib/api'
import { getTranslations } from 'next-intl/server'

type Props = {
  account: Account
  locale: Locale
  isAdmin?: boolean
}

export async function AccountShell({ account, locale, isAdmin = false }: Props) {
  const t = await getTranslations('acc')

  return (
    <section className="account">
      <AccountHeader account={account}>
        <EditProfileTrigger
          username={(account.username as string | undefined) ?? ''}
          currentColor={(account.color as string | undefined) ?? null}
          currentImage={(account.image as string | undefined) ?? null}
        />
      </AccountHeader>

      <VerifyBanner show={!account.email_verified && !account.is_guest} />

      <div className="account__grid">
        <div>
          <MemberCard account={account} />
          <div style={{ marginTop: '1.1rem' }}>
            <CalloutPlug />
          </div>
          <div style={{ marginTop: '1.1rem' }}>
            <SecurityPanel locale={locale} isAdmin={isAdmin} />
          </div>
        </div>
        <div>
          <IdentityPanel account={account} />
          <div style={{ marginTop: '1.1rem' }}>
            <FriendsPanel />
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '1.5rem' }}>
        <div className="panel__h">
          <h2>{t('history')}</h2>
          <i className="ph ph-clock-counter-clockwise" aria-hidden="true" />
        </div>
        <HistoryPanel />
      </div>
    </section>
  )
}
