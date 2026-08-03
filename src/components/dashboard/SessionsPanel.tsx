'use client'

import { Modal } from '@/components/dashboard/Modal'
import { type Session, fetchSessions } from '@/lib/api'
import { revokeAllSessionsAction, revokeSessionAction } from '@/server/sessions'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useState, useTransition } from 'react'

type Pending = { id: string; isCurrent: boolean } | null

const KIND_ICON: Record<string, string> = {
  browser: 'ph-monitor',
  ryujinx: 'ph-game-controller',
  switch: 'ph-device-mobile',
}

function ago(iso: string, t: ReturnType<typeof useTranslations<'sess'>>): string {
  try {
    const d = (Date.now() - new Date(iso).getTime()) / 1000
    if (d < 90) return t('now')
    if (d < 3600) return t('minAgo', { n: Math.round(d / 60) })
    if (d < 86400) return t('hAgo', { n: Math.round(d / 3600) })
    return t('jAgo', { n: Math.round(d / 86400) })
  } catch {
    return ''
  }
}

export function SessionsPanel() {
  const t = useTranslations('sess')
  const tForm = useTranslations('form')
  const locale = useLocale()
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending>(null)
  const [revoking, startRevoke] = useTransition()
  const [revokingAll, startRevokeAll] = useTransition()
  const [confirmAll, setConfirmAll] = useState(false)

  useEffect(() => {
    setError(null)
    void fetchSessions().then((r) => {
      if (!r) setError(t('loadErr'))
      else setSessions(r.sessions)
    })
  }, [t])

  const onRevoke = () => {
    if (!pending) return
    const target = pending
    setPending(null)
    startRevoke(async () => {
      const r = await revokeSessionAction({ id: target.id, isCurrent: target.isCurrent, locale })
      // If target.isCurrent, the server action redirects — control never returns.
      if (!r.ok) {
        setError(t('loadErr'))
        return
      }
      // Remove the revoked session from local state (optimistic UI).
      setSessions((prev) => (prev ? prev.filter((s) => s.id !== target.id) : prev))
    })
  }

  const onRevokeAll = () => {
    setConfirmAll(false)
    startRevokeAll(async () => {
      await revokeAllSessionsAction({ locale })
      // If we reach here, redirect didn't happen — show error.
    })
  }

  const sorted = (sessions ?? []).slice().sort((a, b) => {
    const ac = a.current ? 1 : 0
    const bc = b.current ? 1 : 0
    return bc - ac
  })

  return (
    <div className="panel">
      <div className="panel__h">
        <h2>{t('panelTitle')}</h2>
        <i className="ph ph-devices" aria-hidden="true" />
      </div>
      <p className="hint" style={{ marginBottom: '1rem' }}>
        {t('intro')}
      </p>
      {error ? (
        <output className="msg msg--err" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </output>
      ) : null}
      <div className="sess-list" id="sessions" data-testid="sessions">
        {sessions === null ? (
          <div className="empty">{t('loading')}</div>
        ) : sorted.length === 0 ? (
          <div className="empty">{t('empty')}</div>
        ) : (
          sorted.map((s) => {
            const id = (s.id as string | undefined) ?? ''
            const kind = (s.kind as string | undefined) ?? ''
            const label = (s.kind_label as string | undefined) ?? kind
            const ip = (s.ip as string | undefined) ?? ''
            const geo = (s.geo as string | undefined) ?? ''
            const lastSeen = (s.last_seen as string | undefined) ?? ''
            const isCurrent = Boolean(s.current)
            const playing = Boolean(s.playing)
            const loc = [geo, ip].filter(Boolean).join(' · ') || ip || t('ipUnknown')
            return (
              <div className="sess" key={id}>
                <div className="sess__ico" aria-hidden="true">
                  <i className={`ph ${KIND_ICON[kind] ?? 'ph-question'}`} />
                </div>
                <div className="sess__main">
                  <div className="sess__top">
                    <span className="sess__kind">{label}</span>
                    {isCurrent ? <span className="sess-cur">{t('thisDevice')}</span> : null}
                    {playing ? (
                      <span className="sess-play">
                        <i className="ph ph-play" aria-hidden="true" /> {t('playing')}
                      </span>
                    ) : null}
                  </div>
                  <div className="sess__meta">
                    <span className="mono">{loc}</span> ·{' '}
                    {t('seen', { t: lastSeen ? ago(lastSeen, t) : '' })}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn--soft btn--sm sess__x"
                  data-id={id}
                  onClick={() => setPending({ id, isCurrent })}
                  disabled={revoking && pending?.id === id}
                  aria-busy={revoking && pending?.id === id}
                >
                  {isCurrent ? t('disconnectMe') : t('disconnect')}
                </button>
              </div>
            )
          })
        )}
      </div>
      <div className="sec-actions" style={{ marginTop: '1.3rem' }}>
        <button
          type="button"
          className="btn btn--danger"
          id="close-all"
          onClick={() => setConfirmAll(true)}
          disabled={revokingAll}
          aria-busy={revokingAll}
        >
          <i className="ph ph-sign-out" aria-hidden="true" />
          <span>{t('closeAll')}</span>
        </button>
      </div>
      <p className="hint" style={{ marginTop: '0.7rem' }}>
        {t.rich('closeAllHint', { b: (chunks) => <b>{chunks}</b> })}
      </p>

      <ConfirmModal
        open={!!pending}
        title={pending?.isCurrent ? t('confirmMeTitle') : t('confirmOtherTitle')}
        body={pending?.isCurrent ? t('confirmMeText') : t('confirmOtherText')}
        okLabel={pending?.isCurrent ? t('disconnectMe') : t('disconnect')}
        cancelLabel={tForm('cancel')}
        onCancel={() => setPending(null)}
        onConfirm={onRevoke}
        busy={revoking}
      />

      <ConfirmModal
        open={confirmAll}
        title={t('confirmAllTitle')}
        body={t('confirmAllText')}
        okLabel={t('closeAllBtn')}
        cancelLabel={tForm('cancel')}
        onCancel={() => setConfirmAll(false)}
        onConfirm={onRevokeAll}
        busy={revokingAll}
        danger
      />
    </div>
  )
}

function ConfirmModal({
  open,
  title,
  body,
  okLabel,
  cancelLabel,
  onCancel,
  onConfirm,
  busy,
  danger = false,
}: {
  open: boolean
  title: string
  body: string
  okLabel: string
  cancelLabel: string
  onCancel: () => void
  onConfirm: () => void
  busy: boolean
  danger?: boolean
}) {
  return (
    <Modal open={open} onClose={onCancel} className="modal__panel--sm">
      <div className="modal__body">
        <div className="modal__ic" aria-hidden="true">
          <i className="ph ph-sign-out" />
        </div>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
      <div className="modal__foot">
        <button type="button" className="btn btn--soft" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={danger ? 'btn btn--danger' : 'btn btn--primary'}
          onClick={onConfirm}
          disabled={busy}
          aria-busy={busy}
        >
          {okLabel}
        </button>
      </div>
    </Modal>
  )
}
