import { Avatar } from '@/components/dashboard/Avatar'
import type { Account } from '@/lib/api'
import { getTranslations } from 'next-intl/server'

type Props = {
  account: Account
  children?: React.ReactNode
}

export async function AccountHeader({ account, children }: Props) {
  const t = await getTranslations('acc')
  const greet = t('hi', { name: account.username ?? '' })

  return (
    <div className="account__head">
      <div className="account__id">
        <div className="account__avatar" aria-hidden="true">
          <Avatar image={account.image} name={account.username} />
        </div>
        <div className="account__txt">
          <span className="account__live">
            <span className="status__dot" aria-hidden="true" />
            <span>{t('live')}</span>
          </span>
          <div className="account__hi">
            <h1>{greet}</h1>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
