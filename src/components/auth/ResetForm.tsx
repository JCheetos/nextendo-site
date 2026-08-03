'use client'

import { type ResetInput, resetSchema } from '@/lib/schemas'
import { resetAction } from '@/server/auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { PasswordField } from './PasswordField'

type Props = {
  locale: string
  token: string
}

export function ResetForm({ locale, token }: Props) {
  const t = useTranslations('reset')
  const tForm = useTranslations('form')
  const tErr = useTranslations('auth.errors')
  const [serverError, setServerError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [pwValid, setPwValid] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ResetInput>({
    resolver: zodResolver(resetSchema),
    mode: 'onChange',
    defaultValues: { password: '', password2: '', token },
  })

  const onSubmit = (data: ResetInput) => {
    setServerError(null)
    startTransition(async () => {
      const result = await resetAction({
        password: data.password,
        password2: data.password2,
        token,
        locale,
      })
      if (result && !result.ok) {
        if (result.fieldErrors?.password) {
          setError('password', { type: 'server', message: result.fieldErrors.password })
        } else if (result.fieldErrors?.password2) {
          setError('password2', { type: 'server', message: result.fieldErrors.password2 })
        } else {
          setServerError(tErr(result.error))
        }
        return
      }
      setDone(true)
    })
  }

  if (!token) {
    return (
      <output id="msg" className="msg show msg--err" role="alert">
        {t('errNoToken')}
      </output>
    )
  }

  if (done) {
    return (
      <output id="msg" className="msg show msg--ok">
        {t('okReset')}
      </output>
    )
  }

  return (
    <form className="auth__form" noValidate onSubmit={handleSubmit(onSubmit)}>
      <output id="msg" className={`msg ${serverError ? 'show msg--err' : ''}`} role="alert">
        {serverError ?? ''}
      </output>

      <div className="fld">
        <label htmlFor="password">{t('newPassword')}</label>
        <PasswordField
          id="password"
          autoComplete="new-password"
          value={watch('password')}
          onChange={(v) => setValue('password', v, { shouldValidate: true })}
          onValidityChange={setPwValid}
        />
      </div>

      <div className="fld">
        <label htmlFor="password2">{t('confirm')}</label>
        <input
          id="password2"
          type="password"
          autoComplete="new-password"
          className="input"
          placeholder={t('pw2Ph')}
          aria-invalid={errors.password2 ? 'true' : undefined}
          aria-describedby="p2hint"
          {...register('password2')}
        />
        <span id="p2hint" className={`fld__hint ${errors.password2 ? 'bad' : ''}`}>
          {errors.password2
            ? errors.password2.message === 'password.noMatch'
              ? t('p2NoMatch')
              : tForm(`errors.${errors.password2.message ?? 'unknown'}`)
            : t('p2Default')}
        </span>
      </div>

      <input type="hidden" value={token} {...register('token')} />

      <button
        className="btn btn--primary btn--block btn--lg"
        type="submit"
        disabled={isPending || !pwValid}
      >
        {isPending ? t('saving') : t('submit')} <i className="ph ph-check" aria-hidden="true" />
      </button>
    </form>
  )
}
