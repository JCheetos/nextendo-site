'use client'

import { resendAction } from '@/server/auth'
import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'

type Props = {
  show: boolean
}

export function VerifyBanner({ show }: Props) {
  const t = useTranslations('acc')
  const tAuth = useTranslations('auth.errors')
  const [pending, start] = useTransition()
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (!show) return null

  const onResend = () => {
    setErr(null)
    start(async () => {
      const r = await resendAction()
      if (r.ok) setSent(true)
      else setErr(tAuth('unknown'))
    })
  }

  return (
    <output className="banner banner--warn">
      <span className="banner__i" aria-hidden="true">
        <i className="ph ph-warning-circle" aria-hidden="true" />
      </span>
      <span className="banner__t">
        {t.rich('verifyBanner', { b: (chunks) => <b>{chunks}</b> })}
      </span>
      <span className="banner__a">
        <button
          type="button"
          className="btn btn--soft btn--sm"
          onClick={onResend}
          disabled={pending || sent}
          aria-busy={pending}
        >
          <i className="ph ph-paper-plane-tilt" aria-hidden="true" />
          <span>{sent ? '✓' : t('resend')}</span>
        </button>
      </span>
      {err ? (
        <output className="msg msg--err" role="alert" style={{ flexBasis: '100%' }}>
          {err}
        </output>
      ) : null}
    </output>
  )
}
