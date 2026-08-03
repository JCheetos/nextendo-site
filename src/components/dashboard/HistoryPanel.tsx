'use client'

import { GameModal } from '@/components/dashboard/GameModal'
import { type HistoryEntry, fetchHistory } from '@/lib/api'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

export function HistoryPanel() {
  const t = useTranslations('acc')
  const locale = useLocale()
  const [data, setData] = useState<HistoryEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<HistoryEntry | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const r = await fetchHistory()
      if (cancelled) return
      if (!r) setError(t('historyErr'))
      else setData(r.history)
    })()
    return () => {
      cancelled = true
    }
  }, [t])

  const fmtHours = (sec: number) => {
    const h = sec / 3600
    if (h < 1) return `${Math.max(1, Math.round(sec / 60))} min`
    return `${h >= 10 ? Math.round(h) : h.toFixed(1)} h`
  }
  const fmtDate = (s?: string) => {
    if (!s) return ''
    try {
      return new Intl.DateTimeFormat(
        {
          fr: 'fr-FR',
          en: 'en-US',
          es: 'es-ES',
          pt: 'pt-BR',
          de: 'de-DE',
          it: 'it-IT',
          ru: 'ru-RU',
          zh: 'zh-CN',
          ja: 'ja-JP',
          ar: 'ar',
        }[locale] ?? 'fr-FR',
        { day: 'numeric', month: 'short', year: 'numeric' },
      ).format(new Date(s))
    } catch {
      return ''
    }
  }

  if (error) return <div className="empty">{error}</div>
  if (data === null) return <div className="empty">{t('historyLoading')}</div>
  if (data.length === 0) return <div className="empty">{t('historyEmpty')}</div>

  return (
    <>
      <div className="history">
        {data.map((h, i) => (
          <HistoryCard
            key={(h.title_id as string) ?? i}
            entry={h}
            fmtHours={fmtHours}
            fmtDate={fmtDate}
            onClick={() => setSelected(h)}
          />
        ))}
      </div>
      {selected ? (
        <GameModal
          entry={selected}
          fmtHours={fmtHours}
          fmtDate={fmtDate}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  )
}

function HistoryCard({
  entry,
  fmtHours,
  fmtDate,
  onClick,
}: {
  entry: HistoryEntry
  fmtHours: (sec: number) => string
  fmtDate: (s?: string) => string
  onClick: () => void
}) {
  const icon = entry.icon ? (
    <img
      src={
        typeof entry.icon === 'string' && /^([A-Za-z0-9+/=]|data:image)/.test(entry.icon)
          ? entry.icon
          : ''
      }
      alt=""
    />
  ) : (
    <i className="ph ph-game-controller" aria-hidden="true" />
  )
  const sec = Number(entry.seconds) || 0
  return (
    <button
      type="button"
      className="history-card history-card--click"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className="history-card__ico">{icon}</div>
      <div className="history-card__main">
        <div className="history-card__name">{(entry.name as string) || '—'}</div>
        <div className="history-card__time">{fmtHours(sec)}</div>
        <div className="history-card__meta">
          {entry.last_played ? fmtDate(entry.last_played) : ''}
        </div>
      </div>
      <i className="ph ph-caret-right history-card__go" aria-hidden="true" />
    </button>
  )
}
