'use client'

import { Modal } from '@/components/dashboard/Modal'
import { type ChangeEmailInput, changeEmailSchema } from '@/lib/schemas'
import { changeEmailAction } from '@/server/account'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useEffect, useId, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'

type Props = {
  open: boolean
  onClose: () => void
  currentEmail?: string
}

type FormState = 'idle' | 'sent'

export function EmailModal({ open, onClose, currentEmail }: Props) {
  const t = useTranslations('em')
  const tForm = useTranslations('form')
  const tAuth = useTranslations('auth.errors')
  const titleId = useId()
  const [pending, start] = useTransition()
  const [phase, setPhase] = useState<FormState>('idle')
  const [serverErr, setServerErr] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangeEmailInput>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { email: currentEmail ?? '', password: '' },
  })

  useEffect(() => {
    if (!open) {
      reset({ email: currentEmail ?? '', password: '' })
      setPhase('idle')
      setServerErr(null)
    }
  }, [open, currentEmail, reset])

  const onSubmit = (data: ChangeEmailInput) => {
    setServerErr(null)
    start(async () => {
      const r = await changeEmailAction(data)
      if (r.ok) {
        setPhase('sent')
      } else {
        setServerErr(tAuth(r.error))
      }
    })
  }

  return (
    <Modal open={open} onClose={onClose} titleId={titleId} className="modal__panel--sm">
      <div className="modal__head">
        <h2 id={titleId}>{t('title')}</h2>
        <button type="button" className="modal__x" onClick={onClose} aria-label={tForm('close')}>
          <i className="ph ph-x" aria-hidden="true" />
        </button>
      </div>
      <div className="modal__body">
        {phase === 'sent' ? (
          <p>{t('intro')}</p>
        ) : (
          <form id="email-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <p className="hint" style={{ marginBottom: '0.9rem' }}>
              {t('intro')}
            </p>
            <div className="fld" style={{ marginBottom: '0.8rem' }}>
              <label htmlFor="em-new">{t('new')}</label>
              <input
                id="em-new"
                type="email"
                autoComplete="email"
                className="input"
                placeholder={t('newPh')}
                {...register('email')}
              />
              {errors.email ? (
                <span className="fld__hint" style={{ color: 'var(--danger)' }}>
                  {errors.email.message}
                </span>
              ) : null}
            </div>
            <div className="fld">
              <label htmlFor="em-pw">{t('currentPw')}</label>
              <input
                id="em-pw"
                type="password"
                autoComplete="current-password"
                className="input"
                placeholder={t('currentPwPh')}
                {...register('password')}
              />
              {errors.password ? (
                <span className="fld__hint" style={{ color: 'var(--danger)' }}>
                  {errors.password.message}
                </span>
              ) : null}
            </div>
            {serverErr ? (
              <output className="msg msg--err" role="alert" style={{ marginTop: '0.6rem' }}>
                {serverErr}
              </output>
            ) : null}
          </form>
        )}
      </div>
      <div className="modal__foot">
        <button type="button" className="btn btn--soft" onClick={onClose}>
          {phase === 'sent' ? tForm('close') : tForm('cancel')}
        </button>
        {phase === 'idle' ? (
          <button
            type="submit"
            form="email-form"
            className="btn btn--primary"
            disabled={pending}
            aria-busy={pending}
          >
            {t('save')}
          </button>
        ) : null}
      </div>
    </Modal>
  )
}
