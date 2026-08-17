'use client'

import { Modal } from '@/components/dashboard/Modal'
import { type CloudSave, type SavesResponse, formatSaveSize } from '@/lib/saves'
import { deleteSaveAction, previewSaveAction } from '@/server/saves'
import { useLocale, useTranslations } from 'next-intl'
import { useRef, useState } from 'react'

type Props = { data: SavesResponse | null; canUse: boolean }

export function CloudSavesPanel({ data, canUse }: Props) {
  const t = useTranslations('acc')
  const locale = useLocale()
  const [saves, setSaves] = useState(data?.saves ?? [])
  const [quotaState, setQuotaState] = useState(data?.quota)
  const [selected, setSelected] = useState<CloudSave | null>(null)
  const [preview, setPreview] = useState<unknown>(null)
  const [previewStatus, setPreviewStatus] = useState<
    'idle' | 'loading' | 'success' | 'unsupported' | 'error'
  >('idle')
  const [modalError, setModalError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error] = useState<string | null>(data ? null : t('savesErr'))
  const operation = useRef(0)

  if (!canUse) return <Gate />
  if (!data && error)
    return (
      <Panel title={t('savesTitle')}>
        <div className="empty">{error}</div>
      </Panel>
    )

  const quota = quotaState
  const percent = quota?.limit ? Math.min(100, (quota.used / quota.limit) * 100) : 0
  const openPreview = async (save: CloudSave) => {
    const currentOperation = ++operation.current
    setSelected(save)
    setConfirmDelete(false)
    setPreview(null)
    setModalError(null)
    setPreviewStatus(save.supported === false ? 'unsupported' : 'loading')
    if (save.supported === false) return
    setBusy(true)
    const result = await previewSaveAction({ titleId: save.titleId, locale })
    if (currentOperation !== operation.current) return
    setBusy(false)
    if (result.ok) {
      setPreview(result.data)
      setPreviewStatus('success')
    } else {
      setModalError(t('savesPreviewErr'))
      setPreviewStatus('error')
    }
  }
  const remove = async () => {
    if (!selected) return
    const saveToRemove = selected
    const currentOperation = ++operation.current
    setBusy(true)
    const result = await deleteSaveAction({ titleId: saveToRemove.titleId })
    if (currentOperation !== operation.current) return
    setBusy(false)
    if (!result.ok) {
      setModalError(t('savesDeleteErr'))
      setPreviewStatus('error')
      return
    }
    setSaves((items) => items.filter((item) => item.titleId !== saveToRemove.titleId))
    setQuotaState((current) =>
      current ? { ...current, used: Math.max(0, current.used - saveToRemove.size) } : current,
    )
    setSelected(null)
  }

  return (
    <Panel title={t('savesTitle')}>
      <div className="cloud-saves__quota">
        <div>
          <span>{t('savesQuota')}</span>
          <strong>
            {formatSaveSize(quota?.used ?? 0)} / {formatSaveSize(quota?.limit ?? 0)}
          </strong>
        </div>
        <div
          className="cloud-saves__bar"
          role="progressbar"
          tabIndex={0}
          aria-label={t('savesQuota')}
          aria-valuemin={0}
          aria-valuemax={quota?.limit ?? 0}
          aria-valuenow={quota?.used ?? 0}
          aria-valuetext={`${formatSaveSize(quota?.used ?? 0)} / ${formatSaveSize(quota?.limit ?? 0)}`}
        >
          <span style={{ width: `${percent}%` }} aria-hidden="true" />
        </div>
        {quota?.booster ? <small>{t('savesBooster')}</small> : null}
      </div>
      {saves.length === 0 ? (
        <div className="empty">{t('savesEmpty')}</div>
      ) : (
        <div className="cloud-saves">
          {saves.map((save) => (
            <article className="cloud-save" key={save.titleId}>
              <div>
                <i className="ph ph-cloud-arrow-up" aria-hidden="true" />
                <div>
                  <h3>{save.title}</h3>
                  <p className="hint">
                    {save.titleId} · {formatSaveSize(save.size)}
                  </p>
                </div>
              </div>
              <div className="cloud-save__actions">
                <button
                  className="btn btn--soft btn--sm"
                  type="button"
                  disabled={busy}
                  onClick={() => void openPreview(save)}
                >
                  {t('savesPreview')}
                </button>
                <a
                  className="btn btn--primary btn--sm"
                  aria-disabled={busy}
                  href={`/api/cloud-saves/${encodeURIComponent(save.titleId)}`}
                  onClick={(event) => {
                    if (busy) event.preventDefault()
                  }}
                >
                  {t('savesDownload')}
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
      <Modal
        open={selected !== null}
        onClose={() => {
          operation.current += 1
          setBusy(false)
          setSelected(null)
          setConfirmDelete(false)
        }}
        titleId="save-title"
      >
        <div className="modal__head">
          <h2 id="save-title">{selected?.title}</h2>
          <button
            className="modal__x"
            type="button"
            disabled={busy}
            onClick={() => {
              operation.current += 1
              setBusy(false)
              setSelected(null)
            }}
            aria-label={t('close')}
          >
            <i className="ph ph-x" aria-hidden="true" />
          </button>
        </div>
        <div className="modal__body">
          <div className="cloud-save__preview">
            {previewStatus === 'loading' ? (
              <output>{t('savesLoading')}</output>
            ) : previewStatus === 'success' ? (
              <pre>{JSON.stringify(preview, null, 2)}</pre>
            ) : previewStatus === 'unsupported' ? (
              <p className="hint">{t('savesUnsupported')}</p>
            ) : previewStatus === 'error' ? (
              <p className="cloud-save__error" role="alert">
                {modalError ?? t('savesPreviewErr')}
              </p>
            ) : (
              <p className="hint">{t('savesIdle')}</p>
            )}
          </div>
        </div>
        <div className="modal__foot">
          <button
            className="btn btn--danger"
            type="button"
            disabled={busy}
            onClick={() => (confirmDelete ? void remove() : setConfirmDelete(true))}
          >
            <i className="ph ph-trash" aria-hidden="true" />{' '}
            {confirmDelete ? t('savesConfirmDelete') : t('savesDelete')}
          </button>
          <button
            className="btn btn--soft"
            type="button"
            disabled={busy}
            onClick={() => {
              operation.current += 1
              setBusy(false)
              setSelected(null)
            }}
          >
            {t('close')}
          </button>
        </div>
      </Modal>
    </Panel>
  )
}

function Panel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="panel cloud-saves-panel">
      <div className="panel__h">
        <h2>{title}</h2>
        <i className="ph ph-cloud" aria-hidden="true" />
      </div>
      {children}
    </section>
  )
}
function Gate() {
  const t = useTranslations('acc')
  return (
    <Panel title={t('savesTitle')}>
      <div className="cloud-saves__gate">
        <i className="ph ph-shield-check" aria-hidden="true" />
        <h3>{t('savesGateTitle')}</h3>
        <p className="hint">{t('savesGate')}</p>
      </div>
    </Panel>
  )
}
