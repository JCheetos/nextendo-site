'use client'

import { Avatar } from '@/components/dashboard/Avatar'
import { FriendModal } from '@/components/dashboard/FriendModal'
import { type Friend, addFriend, fetchFriends } from '@/lib/api'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

const FRIENDS_SHOWN = 8

export function FriendsPanel() {
  const t = useTranslations('acc')
  const tFr = useTranslations('fr')
  const [data, setData] = useState<{ friends: Friend[]; requests: Friend[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [selected, setSelected] = useState<Friend | null>(null)
  const [code, setCode] = useState('')
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setError(null)
    void fetchFriends().then((r) => {
      if (!r) setError(tFr('loadErr'))
      else setData(r)
    })
  }, [tFr])

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setAdding(true)
    const r = await addFriend(code.trim())
    setAdding(false)
    if (!r.ok) {
      setToast(tFr('loadErr'))
    } else {
      setToast(tFr('toastAdded'))
      setCode('')
      void fetchFriends().then((r2) => {
        if (r2) setData(r2)
      })
    }
    setTimeout(() => setToast(null), 2200)
  }

  const refresh = () =>
    void fetchFriends().then((r) => {
      if (r) setData(r)
    })

  const onAccept = async (pid: string | number) => {
    await import('@/lib/api').then((m) => m.acceptFriend(pid))
    refresh()
  }
  const onDecline = async (pid: string | number) => {
    await import('@/lib/api').then((m) => m.declineFriend(pid))
    refresh()
  }

  const friends = data?.friends ?? []
  const requests = data?.requests ?? []
  const visible = showAll ? friends : friends.slice(0, FRIENDS_SHOWN)
  const hidden = friends.length - visible.length

  return (
    <>
      <div className="panel">
        <div className="panel__h">
          <h2>{t('friends')}</h2>
          <i className="ph ph-users-three" aria-hidden="true" />
        </div>
        <div id="requests" data-testid="friend-requests">
          {requests.map((r) => (
            <FriendRequestRow
              key={(r.pid as string) ?? Math.random()}
              friend={r}
              onAccept={() => onAccept(r.pid as string)}
              onDecline={() => onDecline(r.pid as string)}
              acceptLabel={tFr('accept')}
              declineLabel={tFr('decline')}
              wantsLabel={tFr('wantsToAdd')}
            />
          ))}
        </div>
        <div className="friends" id="friends" data-testid="friend-list">
          {error ? (
            <div className="empty">{error}</div>
          ) : data === null ? (
            <div className="empty">{t('friendsLoading')}</div>
          ) : friends.length === 0 ? (
            <div className="empty">{tFr('empty')}</div>
          ) : (
            <>
              {visible.map((f) => (
                <FriendRow
                  key={(f.pid as string) ?? Math.random()}
                  friend={f}
                  favoriteLabel={tFr('favorite')}
                  onClick={() => setSelected(f)}
                />
              ))}
              {hidden > 0 ? (
                <button
                  type="button"
                  className="btn btn--soft btn--sm"
                  style={{ marginTop: '0.7rem', width: '100%' }}
                  onClick={() => setShowAll(true)}
                >
                  {tFr('showMore', { n: hidden })}
                </button>
              ) : null}
            </>
          )}
        </div>
        <form className="add-friend" onSubmit={onAdd}>
          <input
            className="input"
            id="fc-input"
            placeholder="SW-0000-0000-0000"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            aria-label={t('add')}
            disabled={adding}
          />
          <button type="submit" className="btn btn--primary" disabled={adding}>
            {t('add')}
          </button>
        </form>
        <p className="hint" style={{ marginTop: '0.7rem' }}>
          {t('friendsHint')}
        </p>
      </div>

      {selected ? <FriendModal friend={selected} onClose={() => setSelected(null)} /> : null}

      {toast ? (
        <output className="toast show" aria-live="polite">
          <span className="toast__k">✓</span>
          <span>{toast}</span>
        </output>
      ) : null}
    </>
  )
}

function FriendRequestRow({
  friend,
  onAccept,
  onDecline,
  acceptLabel,
  declineLabel,
  wantsLabel,
}: {
  friend: Friend
  onAccept: () => void
  onDecline: () => void
  acceptLabel: string
  declineLabel: string
  wantsLabel: string
}) {
  return (
    <div className="friend" style={{ marginBottom: '0.5rem' }}>
      <div className="friend__av">
        <Avatar
          image={(friend.image as string | undefined) ?? null}
          avatar={(friend.avatar as string | undefined) ?? null}
          color={(friend.color as string | undefined) ?? null}
          name={(friend.username as string | undefined) ?? ''}
        />
      </div>
      <div className="friend__main">
        <div className="friend__name">
          {(friend.name as string | undefined) ?? (friend.username as string | undefined)}
        </div>
        <div className="friend__code">{wantsLabel}</div>
      </div>
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <button type="button" className="btn btn--primary btn--sm" onClick={onAccept}>
          {acceptLabel}
        </button>
        <button type="button" className="btn btn--soft btn--sm" onClick={onDecline}>
          {declineLabel}
        </button>
      </div>
    </div>
  )
}

function FriendRow({
  friend,
  favoriteLabel,
  onClick,
}: {
  friend: Friend
  favoriteLabel: string
  onClick: () => void
}) {
  const pi = presenceInfo(friend)
  const dotCls = pi.inGame ? 'on playing' : pi.online ? 'on' : ''
  const color = isValidHex(friend.color as string | undefined) ? (friend.color as string) : ''
  const avString = String(friend.avatar ?? '')
  const avStyle =
    !friend.image && avString && !avString.startsWith('img:') && color
      ? { background: color }
      : undefined

  return (
    <button
      type="button"
      className="friend friend--click"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className="friend__av" style={avStyle}>
        <Avatar
          image={(friend.image as string | undefined) ?? null}
          avatar={(friend.avatar as string | undefined) ?? null}
          color={(friend.color as string | undefined) ?? null}
          name={(friend.username as string | undefined) ?? ''}
        />
      </div>
      <div className="friend__main">
        <div className="friend__name">
          {(friend.name as string | undefined) ?? (friend.username as string | undefined)}
        </div>
        <div className="friend__code">{(friend.friend_code as string | undefined) ?? ''}</div>
      </div>
      <div className={pi.inGame ? 'friend__status friend__status--game' : 'friend__status'}>
        <span className={`friend__dot ${dotCls}`} />
        <span className="friend__st-txt">
          {pi.online ? (pi.inGame ? '...' : 'online') : 'offline'}
        </span>
      </div>
      <i className="ph ph-caret-right friend__go" aria-hidden="true" />
      <span className="sr-only" style={{ position: 'absolute', left: '-9999px' }}>
        {favoriteLabel}
      </span>
    </button>
  )
}

type PresenceInfo = { online: boolean; inGame: boolean; appId: string; detail: string }

function presenceInfo(friend: Friend): PresenceInfo {
  const p = (friend.presence ?? {}) as { status?: number; app_id?: string; app_detail?: string }
  const online = Number(p.status ?? 0) > 0
  return {
    online,
    inGame: online && Boolean(p.app_id),
    appId: p.app_id ?? '',
    detail: (p.app_detail ?? '').trim(),
  }
}

function isValidHex(c: string | undefined): c is string {
  return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c)
}
