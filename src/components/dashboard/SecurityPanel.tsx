'use client'

import { DeleteModal } from '@/components/dashboard/DeleteModal'
import { EmailModal } from '@/components/dashboard/EmailModal'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

type Props = {
  locale: string
  isAdmin?: boolean
}

export function SecurityPanel({ locale, isAdmin = false }: Props) {
  const t = useTranslations('acc')
  const [emailOpen, setEmailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <div className="panel">
      <div className="panel__h">
        <h2>{t('security')}</h2>
        <i className="ph ph-lock-key" aria-hidden="true" />
      </div>
      <p className="hint" style={{ marginBottom: '0.85rem' }}>
        {t('securityIntro')}
      </p>
      <div className="sec-actions">
        <a className="btn btn--soft btn--sm" href="/forgot">
          <i className="ph ph-key" aria-hidden="true" />
          <span>{t('resetPw')}</span>
        </a>
        <button type="button" className="btn btn--soft btn--sm" onClick={() => setEmailOpen(true)}>
          <i className="ph ph-at" aria-hidden="true" />
          <span>{t('changeEmail')}</span>
        </button>
        <a className="btn btn--soft btn--sm" href="/sessions">
          <i className="ph ph-devices" aria-hidden="true" />
          <span>{t('mySessions')}</span>
        </a>
        {isAdmin ? (
          <a className="btn btn--soft btn--sm" href="/admin" id="admin-link">
            <i className="ph ph-shield-star" aria-hidden="true" />
            <span>{t('adminSpace')}</span>
          </a>
        ) : null}
      </div>
      <div
        className="sec-actions"
        style={{
          marginTop: '0.8rem',
          borderTop: '1px solid var(--line-soft, rgba(255, 255, 255, 0.07))',
          paddingTop: '0.85rem',
        }}
      >
        <button
          type="button"
          className="btn btn--danger btn--sm"
          onClick={() => setDeleteOpen(true)}
        >
          <i className="ph ph-trash" aria-hidden="true" />
          <span>{t('deleteAccount')}</span>
        </button>
      </div>

      <EmailModal open={emailOpen} onClose={() => setEmailOpen(false)} />
      <DeleteModal open={deleteOpen} onClose={() => setDeleteOpen(false)} locale={locale} />
    </div>
  )
}
