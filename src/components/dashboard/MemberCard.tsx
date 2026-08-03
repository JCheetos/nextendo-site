import { Avatar } from '@/components/dashboard/Avatar'
import type { Account } from '@/lib/api'
import { getTranslations } from 'next-intl/server'

type Props = {
  account: Account
}

export async function MemberCard({ account }: Props) {
  const t = await getTranslations('member')
  const tAcc = await getTranslations('acc')

  const isGuest = (account.email ?? '').toLowerCase().endsWith('@nextendo.local')
  const code = account.friend_code ?? 'SW-••••-••••-••••'

  return (
    <div className="member-card">
      <div className="member-card__top">
        <span className="member-card__brand">
          <img src="/favicon.svg" alt="" width={18} height={18} />
          NEXTENDO
        </span>
        <span className="member-card__chip">{isGuest ? tAcc('guest') : tAcc('member')}</span>
      </div>
      <div className="member-card__label">{t('label')}</div>
      <div className="member-card__code">{code}</div>
      <div className="member-card__foot">
        <div className="member-card__name">
          <span>{account.username ?? '—'}</span>
          <span>{t('pseudo')}</span>
        </div>
        <div className="member-card__pic">
          <Avatar
            image={account.image}
            avatar={null}
            color={null}
            name={account.username}
            alt={account.username ?? ''}
          />
        </div>
      </div>
    </div>
  )
}
