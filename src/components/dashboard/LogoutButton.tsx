'use client'

import { logoutAction } from '@/server/auth'
import { useTranslations } from 'next-intl'
import { useTransition } from 'react'

export function LogoutButton({ locale }: { locale: string }) {
  const t = useTranslations('profile')
  const [isPending, start] = useTransition()

  const onClick = () => {
    start(async () => {
      await logoutAction(locale)
    })
  }

  return (
    <button
      type="button"
      className="btn btn--soft btn--sm"
      onClick={onClick}
      disabled={isPending}
      aria-busy={isPending}
    >
      <i className="ph ph-sign-out" aria-hidden="true" />
      <span>{t('logout')}</span>
    </button>
  )
}
