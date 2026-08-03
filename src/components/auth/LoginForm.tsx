'use client'

import { type LoginInput, loginSchema } from '@/lib/schemas'
import { loginAction } from '@/server/auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'

type Props = {
  locale: string
  next: string | null
  turnstileSitekey?: string
}

export function LoginForm({ locale, next, turnstileSitekey }: Props) {
  const t = useTranslations('login')
  const tForm = useTranslations('form')
  const tErr = useTranslations('auth.errors')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [turnstileToken] = useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: '', password: '' },
  })

  const onSubmit = (data: LoginInput) => {
    setServerError(null)
    startTransition(async () => {
      const result = await loginAction({
        login: data.login,
        password: data.password,
        next,
        locale,
        turnstile: turnstileToken || undefined,
      })
      if (result && !result.ok) {
        if (result.fieldErrors?.login) {
          setError('login', { type: 'server', message: result.fieldErrors.login })
        } else if (result.fieldErrors?.password) {
          setError('password', { type: 'server', message: result.fieldErrors.password })
        } else {
          setServerError(tErr(result.error))
        }
        return
      }
      router.refresh()
    })
  }

  return (
    <form className="auth__form" noValidate onSubmit={handleSubmit(onSubmit)}>
      <output id="msg" className={`msg ${serverError ? 'show msg--err' : ''}`} role="alert">
        {serverError ?? ''}
      </output>

      <div className="fld">
        <label htmlFor="login">{tForm('email')}</label>
        <input
          id="login"
          type="email"
          autoComplete="email"
          inputMode="email"
          className="input"
          placeholder={tForm('emailPh')}
          aria-invalid={errors.login ? 'true' : undefined}
          aria-describedby={errors.login ? 'login-error' : undefined}
          {...register('login')}
        />
        {errors.login ? (
          <span id="login-error" className="fld__hint bad">
            {tForm(`errors.${errors.login.message ?? 'unknown'}`)}
          </span>
        ) : null}
      </div>

      <div className="fld">
        <div className="fld__row">
          <label htmlFor="password">{tForm('password')}</label>
          <a className="fld__link" href="/forgot">
            {t('forgot')}
          </a>
        </div>
        <div className="pw">
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="input"
            placeholder="••••••••"
            aria-invalid={errors.password ? 'true' : undefined}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
          />
          <button
            type="button"
            className="pw__eye"
            data-eye="password"
            aria-label={tForm('showPw')}
          >
            <i className="ph ph-eye" aria-hidden="true" />
          </button>
        </div>
        {errors.password ? (
          <span id="password-error" className="fld__hint bad">
            {tForm(`errors.${errors.password.message ?? 'unknown'}`)}
          </span>
        ) : null}
      </div>

      {turnstileSitekey ? (
        <div id="ts" style={{ margin: '4px 0 2px' }} data-sitekey={turnstileSitekey} />
      ) : null}

      <button className="btn btn--primary btn--block btn--lg" type="submit" disabled={isPending}>
        {isPending ? t('loading') : t('submit')}{' '}
        <i className="ph ph-arrow-right" aria-hidden="true" />
      </button>
    </form>
  )
}
