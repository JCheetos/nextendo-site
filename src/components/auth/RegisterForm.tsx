'use client'

import { type RegisterInput, registerSchema } from '@/lib/schemas'
import { registerAction } from '@/server/auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { PasswordField } from './PasswordField'

type Props = {
  locale: string
  initialClosed?: boolean
  turnstileSitekey?: string
}

export function RegisterForm({ locale, initialClosed, turnstileSitekey }: Props) {
  const t = useTranslations('register')
  const tForm = useTranslations('form')
  const tErr = useTranslations('auth.errors')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [turnstileToken] = useState<string>('')
  const [pwValid, setPwValid] = useState(false)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const [closed, setClosed] = useState(Boolean(initialClosed))

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: { username: '', email: '', password: '', password2: '' },
  })

  // Preflight /api/site-config to mirror the legacy "sign-ups closed" banner.
  useEffect(() => {
    if (initialClosed !== undefined) return
    let cancelled = false
    fetch('/api/site-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (!cancelled && cfg?.registration_open === false) setClosed(true)
      })
      .catch(() => {
        /* ignore — backend offline, default open */
      })
    return () => {
      cancelled = true
    }
  }, [initialClosed])

  const onSubmit = (data: RegisterInput) => {
    setServerError(null)
    startTransition(async () => {
      const result = await registerAction({
        username: data.username,
        email: data.email,
        password: data.password,
        password2: data.password2,
        locale,
        turnstile: turnstileToken || undefined,
      })
      if (result && !result.ok) {
        if (result.error === 'closedRegistration') {
          setClosed(true)
          return
        }
        if (result.fieldErrors?.username) {
          setError('username', { type: 'server', message: result.fieldErrors.username })
        } else if (result.fieldErrors?.email) {
          setError('email', { type: 'server', message: result.fieldErrors.email })
        } else if (result.fieldErrors?.password) {
          setError('password', { type: 'server', message: result.fieldErrors.password })
        } else {
          setServerError(tErr(result.error))
        }
        return
      }
      setSentEmail(data.email)
      setShowVerifyModal(true)
    })
  }

  return (
    <>
      {closed ? (
        <div
          id="closed-notice"
          style={{
            padding: '0.95rem 1.1rem',
            border: '1px solid var(--line)',
            borderRadius: '0.75rem',
            background: 'color-mix(in oklch, var(--signal) 14%, transparent)',
            lineHeight: 1.5,
            marginBottom: '1.1rem',
          }}
        >
          <strong>{t('closedNoticeTitle')}</strong>
          <br />
          {t('closedNoticeBody')}
        </div>
      ) : null}

      <form className="auth__form" noValidate onSubmit={handleSubmit(onSubmit)} hidden={closed}>
        <output id="msg" className={`msg ${serverError ? 'show msg--err' : ''}`} role="alert">
          {serverError ?? ''}
        </output>

        <div className="fld">
          <label htmlFor="username">{t('username')}</label>
          <input
            id="username"
            className="input"
            autoComplete="username"
            placeholder={t('usernamePh')}
            aria-invalid={errors.username ? 'true' : undefined}
            aria-describedby={errors.username ? 'username-error uhint' : 'uhint'}
            {...register('username')}
          />
          <span id="uhint" className={`fld__hint ${errors.username ? 'bad' : ''}`}>
            {errors.username
              ? tForm(`errors.${errors.username.message ?? 'unknown'}`)
              : t('usernameHint')}
          </span>
        </div>

        <div className="fld">
          <label htmlFor="email">{tForm('email')}</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="input"
            placeholder={tForm('emailPh')}
            aria-invalid={errors.email ? 'true' : undefined}
            aria-describedby={errors.email ? 'email-error email-hint' : 'email-hint'}
            {...register('email')}
          />
          <span id="email-hint" className={`fld__hint ${errors.email ? 'bad' : ''}`}>
            {errors.email ? tForm(`errors.${errors.email.message ?? 'unknown'}`) : t('emailHint')}
          </span>
        </div>

        <div className="fld">
          <label htmlFor="password">{tForm('password')}</label>
          <PasswordField
            id="password"
            autoComplete="new-password"
            value={watch('password')}
            onChange={(v) => setValue('password', v, { shouldValidate: true })}
            onValidityChange={setPwValid}
          />
        </div>

        <div className="fld">
          <label htmlFor="password2">{t('password2')}</label>
          <input
            id="password2"
            type="password"
            autoComplete="new-password"
            className="input"
            placeholder={t('password2Ph')}
            aria-invalid={errors.password2 ? 'true' : undefined}
            aria-describedby="p2hint"
            {...register('password2')}
          />
          <span id="p2hint" className={`fld__hint ${errors.password2 ? 'bad' : ''}`}>
            {errors.password2
              ? errors.password2.message === 'password.noMatch'
                ? t('pwNoMatch')
                : tForm(`errors.${errors.password2.message ?? 'unknown'}`)
              : t('password2Hint')}
          </span>
        </div>

        {turnstileSitekey ? (
          <div id="ts" style={{ margin: '4px 0 2px' }} data-sitekey={turnstileSitekey} />
        ) : null}

        <button
          className="btn btn--primary btn--block btn--lg"
          type="submit"
          disabled={isPending || !pwValid}
        >
          {isPending ? t('loading') : t('submit')}{' '}
          <i className="ph ph-arrow-right" aria-hidden="true" />
        </button>
      </form>

      {showVerifyModal ? (
        <dialog className="modal" aria-labelledby="vm-title" open>
          <div className="modal__backdrop" />
          <div className="modal__panel modal__panel--sm">
            <div className="modal__ic">
              <i className="ph ph-envelope-simple-open" aria-hidden="true" />
            </div>
            <h2 id="vm-title">{t('vmTitle')}</h2>
            <p>
              {t.rich('vmBody', {
                email: () => <span className="mono">{sentEmail}</span>,
              })}
            </p>
            <p className="fld__hint">{t('vmHint')}</p>
            <div className="modal__foot" style={{ justifyContent: 'center', border: 0 }}>
              <button
                className="btn btn--primary"
                type="button"
                onClick={() => router.push(`/${locale}/compte`)}
              >
                {t('vmContinue')} <i className="ph ph-arrow-right" aria-hidden="true" />
              </button>
            </div>
          </div>
        </dialog>
      ) : null}
    </>
  )
}
