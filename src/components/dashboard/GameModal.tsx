'use client'

import { Modal } from '@/components/dashboard/Modal'
import { type GameInfo, type HistoryEntry, fetchGameInfo } from '@/lib/api'
import { useTranslations } from 'next-intl'
import { useEffect, useId, useState } from 'react'

type Props = {
  entry: HistoryEntry
  fmtHours: (sec: number) => string
  fmtDate: (s?: string) => string
  onClose: () => void
}

const LINK_ICON: Record<string, string> = {
  website: 'ph-globe',
  wikipedia: 'ph-book-open-text',
  youtube: 'ph-youtube-logo',
  x: 'ph-x-logo',
  twitter: 'ph-x-logo',
  twitch: 'ph-twitch-logo',
  instagram: 'ph-instagram-logo',
  reddit: 'ph-reddit-logo',
  discord: 'ph-discord-logo',
  eshop: 'ph-storefront',
  facebook: 'ph-facebook-logo',
}

export function GameModal({ entry, fmtHours, fmtDate, onClose }: Props) {
  const titleId = useId()
  const tGm = useTranslations('gm')
  const tForm = useTranslations('form')
  const [info, setInfo] = useState<GameInfo | null>(null)
  const [shot, setShot] = useState<string>('')

  const name = (entry.name as string | undefined) ?? tGm('defaultName')
  const tid = (entry.title_id as string | undefined) ?? ''
  const accent = info?.accent && /^#[0-9a-fA-F]{6}$/.test(info.accent) ? info.accent : '#1ca9e0'
  const metacriticCls = (n?: number) =>
    typeof n === 'number' ? (n >= 75 ? 'hi' : n >= 50 ? 'mid' : 'lo') : ''

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const g = await fetchGameInfo(tid, name)
      if (!cancelled) {
        setInfo(g)
        const hero = g?.hero
        const firstShot = (g?.screenshots ?? [])[0]
        setShot(hero || firstShot || '')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tid, name])

  const onShot = (s: string) => setShot(s)
  const sec = Number(entry.seconds) || 0
  const hero = info?.hero
  const shots = info?.screenshots ?? []
  const allShots = hero ? [hero, ...shots] : shots

  return (
    <Modal open onClose={onClose} titleId={titleId} className="modal__panel--game">
      <button
        type="button"
        className="modal__x gm-head__x"
        onClick={onClose}
        aria-label={tForm('close')}
      >
        <i className="ph ph-x" aria-hidden="true" />
      </button>
      <div
        className="gm-head"
        style={
          {
            '--gm-accent': accent,
            backgroundImage: hero ? `url(${hero})` : undefined,
          } as React.CSSProperties
        }
      >
        <div
          className="gm-head__bg"
          style={{ backgroundImage: hero ? `url(${hero})` : undefined }}
          aria-hidden="true"
        />
        <div
          className="gm-cover"
          style={{
            backgroundImage: entry.icon
              ? `url(${typeof entry.icon === 'string' ? entry.icon : ''})`
              : undefined,
          }}
          aria-hidden="true"
        />
        <div className="gm-head__id">
          {info?.metacritic ? (
            <span className={`gm-badge gm-badge--${metacriticCls(info.metacritic)}`}>
              <i className="ph ph-star-four" aria-hidden="true" />
              {info.metacritic} Metascore
            </span>
          ) : null}
          <h2 id={titleId}>{info?.name ?? name}</h2>
          <div className="gm-sub">{info?.genres?.join(' · ')}</div>
        </div>
      </div>
      <div className="gm-body">
        <div className="gm-main">
          {allShots.length ? (
            <div className="gm-media">
              <div
                className="gm-stage"
                style={{ backgroundImage: shot ? `url(${shot})` : undefined }}
              />
              <div className="gm-thumbs">
                {allShots.map((s, i) => (
                  <button
                    key={`shot-${i}-${s.slice(0, 16)}`}
                    type="button"
                    className={`gm-thumb${s === shot ? ' sel' : ''}`}
                    style={{ backgroundImage: `url(${s})` }}
                    onClick={() => onShot(s)}
                    aria-label={tGm('screenshotAria', { n: i + 1 })}
                  />
                ))}
              </div>
            </div>
          ) : null}
          <p className="gm-desc">{info?.description ?? ''}</p>
        </div>
        <aside className="gm-side">
          <div className="gm-block gm-prog">
            <div className="modal__sub">{tGm('yourProgress')}</div>
            <div className="gm-prog__row">
              <i className="ph ph-clock-user" />
              <div>
                <b>{fmtHours(sec)}</b>
                <span>{tGm('playtimeOf')}</span>
              </div>
            </div>
            <div className="gm-prog__row">
              <i className="ph ph-calendar-blank" />
              <div>
                <b>{entry.last_played ? fmtDate(entry.last_played) : '—'}</b>
                <span>{tGm('lastSession')}</span>
              </div>
            </div>
          </div>
          <div className="gm-block gm-details">
            <div className="modal__sub">{tGm('details')}</div>
            <DetailRow label={tGm('genres')} value={info?.genres?.join(', ') ?? '—'} />
            <DetailRow label={tGm('publisher')} value={info?.publisher ?? '—'} />
            <DetailRow label={tGm('developer')} value={info?.developer ?? '—'} />
            <DetailRow label={tGm('release')} value={info?.release_date ?? '—'} />
            <div className="gm-drow">
              <span className="gm-dk">{tGm('platforms')}</span>
              <span className="gm-dv gm-icons">
                <span className="gm-plat">
                  <i className="ph ph-game-controller" aria-hidden="true" />
                  {(info?.platforms?.[0] as string | undefined) ?? 'Nintendo Switch'}
                </span>
              </span>
            </div>
            {info?.links?.length ? (
              <div className="gm-drow">
                <span className="gm-dk">{tGm('links')}</span>
                <span className="gm-dv gm-icons">
                  {info.links.map((l, i) => {
                    const url = /^https?:\/\//i.test(l.url ?? '') ? (l.url as string) : '#'
                    const key = `${l.type ?? 'link'}-${i}-${url.slice(0, 16)}`
                    return (
                      <a
                        key={key}
                        href={url}
                        target="_blank"
                        rel="noreferrer noopener"
                        title={l.type ?? ''}
                      >
                        <i
                          className={`ph ${LINK_ICON[l.type as string] ?? 'ph-link-simple'}`}
                          aria-hidden="true"
                        />
                      </a>
                    )
                  })}
                </span>
              </div>
            ) : null}
            {info?.metacritic ? (
              <div className="gm-drow">
                <span className="gm-dk">{tGm('metacritic')}</span>
                <span className={`gm-dv gm-meta gm-meta--${metacriticCls(info.metacritic)}`}>
                  {info.metacritic}
                </span>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
      <div className="modal__foot">
        <button type="button" className="btn btn--soft" onClick={onClose}>
          {tForm('close')}
        </button>
      </div>
    </Modal>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="gm-drow">
      <span className="gm-dk">{label}</span>
      <span className="gm-dv">{value}</span>
    </div>
  )
}
