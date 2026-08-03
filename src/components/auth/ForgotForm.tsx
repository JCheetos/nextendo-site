'use client'

import { type ForgotInput, forgotSchema } from '@/lib/schemas'
import { forgotAction } from '@/server/auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'

type Props = {
  locale: string
}

export function ForgotForm({ locale }: Props) {
  const t = useTranslations('forgot')
  const tForm = useTranslations('form')
  const tErr = useTranslations('auth.errors')
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotInput>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = (data: ForgotInput) => {
    setServerError(null)
    startTransition(async () => {
      const result = await forgotAction({ email: data.email, locale })
      if (result && !result.ok) {
        if (result.fieldErrors?.email) {
          setError('email', { type: 'server', message: result.fieldErrors.email })
        } else {
          setServerError(tErr(result.error))
        }
        return
      }
      setSent(true)
    })
  }

  if (sent) {
    return (
      <output id="msg" className="msg show msg--ok">
        {t('sent')}
      </output>
    )
  }

  return (
    <form className="auth__form" noValidate onSubmit={handleSubmit(onSubmit)}>
      <output id="msg" className={`msg ${serverError ? 'show msg--err' : ''}`} role="alert">
        {serverError ?? ''}
      </output>

      <div className="fld">
        <label htmlFor="email">{tForm('email')}</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          className="input"
          placeholder={tForm('emailPh')}
          aria-invalid={errors.email ? 'true' : undefined}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
        {errors.email ? (
          <span id="email-error" className="fld__hint bad">
            {tForm(`errors.${errors.email.message ?? 'unknown'}`)}
          </span>
        ) : null}
      </div>

      <button className="btn btn--primary btn--block btn--lg" type="submit" disabled={isPending}>
        {isPending ? t('loading') : t('submit')}{' '}
        <i className="ph ph-paper-plane-tilt" aria-hidden="true" />
      </button>
    </form>
  )
}
