'use client'

import { Avatar } from '@/components/dashboard/Avatar'
import { Modal } from '@/components/dashboard/Modal'
import {
  type Friend,
  type HistoryEntry,
  blockFriend,
  fetchFriendHistory,
  removeFriend,
} from '@/lib/api'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useId, useState } from 'react'

type Props = {
  friend: Friend
  onClose: () => void
}

export function FriendModal({ friend, onClose }: Props) {
  const titleId = useId()
  const tFr = useTranslations('fr')
  const _tFm = useTranslations('fr')
  const tAcc = useTranslations('acc')
  const tForm = useTranslations('form')
  const locale = useLocale()
  const [history, setHistory] = useState<HistoryEntry[] | null>(null)

  const pi = presenceInfo(friend)
  const accent = isValidHex(friend.color as string | undefined)
    ? (friend.color as string)
    : '#1ca9e0'

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const pid = friend.pid as string | undefined
      if (!pid) return
      const r = await fetchFriendHistory(pid)
      if (!cancelled) setHistory(r?.history ?? [])
    })()
    return () => {
      cancelled = true
    }
  }, [friend.pid])

  const totalSec = (history ?? []).reduce((s, h) => s + (Number(h.seconds) || 0), 0)
  const fav = (history ?? [])
    .slice()
    .sort((a, b) => (Number(b.seconds) || 0) - (Number(a.seconds) || 0))[0]
  const last = history?.[0]

  const fmtHours = (sec: number) => {
    const h = sec / 3600
    if (h < 1) return `${Math.max(1, Math.round(sec / 60))} min`
    return `${h >= 10 ? Math.round(h) : h.toFixed(1)} h`
  }
  const fmtDate = (s?: string) => {
    if (!s) return '—'
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
      return '—'
    }
  }
  const sinceFmt = (() => {
    const createdAt = friend.created_at as string | undefined
    if (!createdAt) return '—'
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
        { month: 'short', year: 'numeric' },
      ).format(new Date(createdAt))
    } catch {
      return '—'
    }
  })()

  const onRemove = async () => {
    await removeFriend(friend.pid as string)
    onClose()
  }
  const onBlock = async () => {
    await blockFriend(friend.pid as string)
    onClose()
  }

  return (
    <Modal open onClose={onClose} titleId={titleId} className="modal__panel--profile">
      <button
        type="button"
        className="modal__x fm-hero__x"
        onClick={onClose}
        aria-label={tForm('close')}
      >
        <i className="ph ph-x" aria-hidden="true" />
      </button>
      <div className="fm-hero" style={{ '--fm-accent': accent } as React.CSSProperties}>
        <div className="fm-pic">
          <Avatar
            image={(friend.image as string | undefined) ?? null}
            avatar={(friend.avatar as string | undefined) ?? null}
            color={(friend.color as string | undefined) ?? null}
            name={(friend.username as string | undefined) ?? ''}
          />
        </div>
        <div className="fm-hero__id">
          <h2 id={titleId}>
            {(friend.name as string | undefined) ?? (friend.username as string | undefined)}
          </h2>
          <div className="fm-hero__meta">
            <span
              className={`fm-badge ${
                pi.inGame ? 'fm-badge--game' : pi.online ? 'fm-badge--on' : 'fm-badge--off'
              }`}
            >
              <span
                className={`friend__dot ${pi.online ? (pi.inGame ? 'on playing' : 'on') : ''}`}
              />
              <span>{pi.online ? (pi.inGame ? '...' : 'online') : 'offline'}</span>
            </span>
            <span className="fm-code">{(friend.friend_code as string | undefined) ?? '—'}</span>
          </div>
        </div>
      </div>
      <div className="modal__body">
        <div className="fm-stats">
          <div className="fm-stat">
            <i className="ph ph-clock-user" />
            <div>
              <span className="fm-stat__v">
                {history ? (history.length ? fmtHours(totalSec) : '0 min') : '—'}
              </span>
              <span className="fm-stat__k">{tFr('playtime')}</span>
            </div>
          </div>
          <div className="fm-stat">
            <i className="ph ph-game-controller" />
            <div>
              <span className="fm-stat__v">{history ? history.length : '—'}</span>
              <span className="fm-stat__k">{tFr('gamesPlayed')}</span>
            </div>
          </div>
          <div className="fm-stat">
            <i className="ph ph-star" />
            <div>
              <span className="fm-stat__v fm-stat__v--sm">{fav ? (fav.name as string) : '—'}</span>
              <span className="fm-stat__k">{tFr('favGame')}</span>
            </div>
          </div>
          <div className="fm-stat">
            <i className="ph ph-calendar-blank" />
            <div>
              <span className="fm-stat__v fm-stat__v--sm">{sinceFmt}</span>
              <span className="fm-stat__k">{tAcc('memberSince')}</span>
            </div>
          </div>
        </div>
        <div className="kv">
          <Row label={tAcc('pid')}>{(friend.pid as string) ?? '—'}</Row>
          <Row label={tFr('lastActivity')}>
            {last?.last_played ? fmtDate(last.last_played) : '—'}
          </Row>
        </div>
        <div>
          <div className="modal__sub">{tAcc('history')}</div>
          {history === null ? (
            <div className="empty">{tFr('loading')}</div>
          ) : history.length === 0 ? (
            <div className="empty">{tFr('noHistory')}</div>
          ) : (
            <div className="history">
              {history.map((h, i) => {
                const key = `${(h.title_id as string | undefined) ?? 'h'}-${i}`
                return <HistoryCard key={key} entry={h} fmtDate={fmtDate} />
              })}
            </div>
          )}
        </div>
      </div>
      <div className="modal__foot">
        <button type="button" className="btn btn--danger" onClick={onBlock}>
          <i className="ph ph-prohibit" aria-hidden="true" /> <span>{tFr('block')}</span>
        </button>
        <button type="button" className="btn btn--soft" onClick={onRemove}>
          <i className="ph ph-user-minus" aria-hidden="true" /> <span>{tFr('remove')}</span>
        </button>
        <button type="button" className="btn btn--soft" onClick={onClose}>
          {tForm('close')}
        </button>
      </div>
    </Modal>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="kv__row">
      <span className="kv__k">{label}</span>
      <span className="kv__v">{children}</span>
    </div>
  )
}

function HistoryCard({
  entry,
  fmtDate,
}: {
  entry: HistoryEntry
  fmtDate: (s?: string) => string
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
    <div className="history-card">
      <div className="history-card__ico">{icon}</div>
      <div className="history-card__main">
        <div className="history-card__name">{(entry.name as string) || '—'}</div>
        <div className="history-card__time">
          {sec >= 3600
            ? `${(sec / 3600).toFixed(1)} h`
            : `${Math.max(1, Math.round(sec / 60))} min`}
        </div>
        <div className="history-card__meta">
          {entry.last_played ? fmtDate(entry.last_played) : ''}
        </div>
      </div>
    </div>
  )
}

type PresenceInfo = { online: boolean; inGame: boolean }

function presenceInfo(friend: Friend): PresenceInfo {
  const p = (friend.presence ?? {}) as { status?: number; app_id?: string }
  const online = Number(p.status ?? 0) > 0
  return { online, inGame: online && Boolean(p.app_id) }
}

function isValidHex(c: string | undefined): c is string {
  return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c)
}
