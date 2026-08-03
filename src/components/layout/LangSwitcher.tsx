'use client'

import { setLocaleAction } from '@/i18n/actions'
import { localeLabels, locales } from '@/i18n/config'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

export function LangSwitcher() {
  const current = useLocale()
  const t = useTranslations('lang')
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [open])

  const onPick = (code: string) => {
    if (code === current || isPending) return
    setIsPending(true)
    const fd = new FormData()
    fd.set('locale', code)
    setLocaleAction(fd)
      .catch(() => {
        /* swallow; next-intl surfaces errors via Next error boundaries */
      })
      .finally(() => {
        setIsPending(false)
        setOpen(false)
      })
  }

  return (
    <div ref={ref} className="lang-switch" style={{ position: 'relative' }}>
      <button
        type="button"
        className="ghost-link"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t('label')}
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
      >
        <i className="ph ph-translate" aria-hidden="true" />
        <span>{localeLabels[current as keyof typeof localeLabels] ?? localeLabels.fr}</span>
        <i className="ph ph-caret-down" aria-hidden="true" />
      </button>
      {open ? (
        <ul
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.4rem)',
            right: 0,
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r)',
            padding: '0.4rem',
            display: 'grid',
            gap: '0.2rem',
            minWidth: '10rem',
            boxShadow: '0 20px 40px -20px #000',
            zIndex: 200,
            listStyle: 'none',
          }}
        >
          {locales.map((code) => (
            <li key={code}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={code === current}
                onClick={() => onPick(code)}
                disabled={isPending}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.5rem 0.7rem',
                  borderRadius: '8px',
                  color: code === current ? 'var(--ink)' : 'var(--muted)',
                  background:
                    code === current
                      ? 'color-mix(in oklch, var(--primary) 14%, transparent)'
                      : 'transparent',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                {localeLabels[code]}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
