'use client'

import { pwChecks } from '@/lib/schemas'
import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'

type Props = {
  id: string
  value: string
  onChange: (v: string) => void
  onValidityChange?: (ok: boolean) => void
  autoComplete?: string
}

const PW_LEVELS = ['tooweak', 'weak', 'medium', 'strong', 'verystrong'] as const

export function PasswordField({
  id,
  value,
  onChange,
  onValidityChange,
  autoComplete = 'new-password',
}: Props) {
  const t = useTranslations('pw')
  const reqsId = useId()
  const labelId = useId()
  const [visible, setVisible] = useState(false)
  const checks = pwChecks(value)
  const ok = checks.len && checks.digit && checks.special

  // Notify parent (so they can disable the submit button until rules pass).
  if (onValidityChange) {
    // Use a microtask to avoid setState-in-render warnings.
    queueMicrotask(() => onValidityChange(ok))
  }

  // Cap visible level to 1 (weak) until all rules pass.
  const rawLevel = Math.min(
    4,
    (value.length >= 8 ? 1 : 0) +
      (value.length >= 12 ? 1 : 0) +
      (checks.digit ? 1 : 0) +
      (checks.special ? 1 : 0) +
      (/[a-z]/.test(value) && /[A-Z]/.test(value) ? 1 : 0),
  )
  const level = ok ? rawLevel : Math.min(rawLevel, 1)

  return (
    <>
      <div className="pw">
        <input
          id={id}
          className="input"
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          aria-describedby={`${reqsId} ${labelId}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="pw__eye"
          data-eye={id}
          aria-label={visible ? t('hide') : t('show')}
          onClick={() => setVisible((v) => !v)}
        >
          <i className={`ph ${visible ? 'ph-eye-slash' : 'ph-eye'}`} aria-hidden="true" />
        </button>
      </div>
      <div className="pw-meter" data-level={value ? String(level) : '-1'}>
        <i />
        <i />
        <i />
        <i />
      </div>
      <div
        className={`pw-meter__label ${value ? `lvl-${level}` : ''}`}
        id={labelId}
        aria-live="polite"
      >
        {value ? t(PW_LEVELS[level]) : ''}
      </div>
      <ul className="pw-reqs" id={reqsId}>
        <li className={checks.len ? 'ok' : ''} data-req="len">
          {t('reqLen')}
        </li>
        <li className={checks.digit ? 'ok' : ''} data-req="digit">
          {t('reqDigit')}
        </li>
        <li className={checks.special ? 'ok' : ''} data-req="special">
          {t('reqSpecial')}
        </li>
      </ul>
    </>
  )
}
