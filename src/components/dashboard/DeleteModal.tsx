'use client'

import { Modal } from '@/components/dashboard/Modal'
import { type DeleteAccountInput, deleteAccountSchema } from '@/lib/schemas'
import { deleteAccountAction } from '@/server/account'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useEffect, useId, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'

type Props = {
  open: boolean
  onClose: () => void
  locale: string
}

export function DeleteModal({ open, onClose, locale }: Props) {
  const t = useTranslations('del')
  const tForm = useTranslations('form')
  const tAuth = useTranslations('auth.errors')
  const titleId = useId()
  const [pending, start] = useTransition()
  const [serverErr, setServerErr] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DeleteAccountInput>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { password: '' },
  })

  useEffect(() => {
    if (!open) {
      reset({ password: '' })
      setServerErr(null)
    }
  }, [open, reset])

  const onSubmit = (data: DeleteAccountInput) => {
    setServerErr(null)
    start(async () => {
      const r = await deleteAccountAction({ ...data, locale })
      if (!r.ok) {
        setServerErr(tAuth(r.error))
      }
      // success → Server Action redirects, control never returns
    })
  }

  return (
    <Modal open={open} onClose={onClose} titleId={titleId}>
      <div className="modal__head">
        <h2 id={titleId}>{t('title')}</h2>
        <button type="button" className="modal__x" onClick={onClose} aria-label={tForm('close')}>
          <i className="ph ph-x" aria-hidden="true" />
        </button>
      </div>
      <div className="modal__body">
        <form id="del-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <p className="hint">{t.rich('warn', { b: (chunks) => <b>{chunks}</b> })}</p>
          <div className="fld" style={{ marginTop: '0.9rem' }}>
            <label htmlFor="del-pw">{t('pw')}</label>
            <input
              id="del-pw"
              type="password"
              autoComplete="current-password"
              className="input"
              placeholder={t('pwPh')}
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
      </div>
      <div className="modal__foot">
        <button type="button" className="btn btn--soft" onClick={onClose}>
          {tForm('cancel')}
        </button>
        <button
          type="submit"
          form="del-form"
          className="btn btn--danger"
          disabled={pending}
          aria-busy={pending}
        >
          <i className="ph ph-trash" aria-hidden="true" />
          <span>{t('confirm')}</span>
        </button>
      </div>
    </Modal>
  )
}
