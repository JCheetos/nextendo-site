'use client'

import { setLocaleAction } from '@/i18n/actions'
import { localeCodes, localeLabels, locales } from '@/i18n/config'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export function LangSwitcher() {
  const current = useLocale()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const currentCode = localeCodes[current as keyof typeof localeCodes] ?? localeCodes.fr
  const currentLabel = localeLabels[current as keyof typeof localeLabels] ?? localeLabels.fr

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const onPick = (code: string) => {
    if (code === current || isPending) return
    setIsPending(true)
    const fd = new FormData()
    fd.set('locale', code)
    setLocaleAction(fd)
      .then(() => router.refresh())
      .catch(() => {
        /* errors surface via Next error boundaries */
      })
      .finally(() => {
        setIsPending(false)
        setOpen(false)
      })
  }

  return (
    <div ref={ref} className={`lang-switch${open ? ' open' : ''}`}>
      <button
        type="button"
        className="lang-switch__btn"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={currentLabel}
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
      >
        <i className="ph ph-translate" aria-hidden="true" />
        <span className="lang-switch__code">{currentCode}</span>
        <i className="ph ph-caret-down" aria-hidden="true" />
      </button>
      <ul className="lang-switch__menu" role="menu">
        {locales.map((code) => {
          const isActive = code === current
          return (
            <li key={code}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                className={`lang-switch__item${isActive ? ' is-active' : ''}`}
                onClick={() => onPick(code)}
                disabled={isPending}
              >
                <span className="lang-switch__code">{localeCodes[code]}</span>
                <span>{localeLabels[code]}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
