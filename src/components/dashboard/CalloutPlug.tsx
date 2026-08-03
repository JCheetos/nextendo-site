import { getTranslations } from 'next-intl/server'

export async function CalloutPlug() {
  const t = await getTranslations('acc')

  return (
    <div className="callout">
      <div className="callout__h">
        <i className="ph ph-plug" aria-hidden="true" style={{ color: 'var(--accent)' }} />
        <span>{t('plugTitle')}</span>
      </div>
      <p className="hint" style={{ marginBottom: '0.7rem' }}>
        {t.rich('plugRyujinx', { b: (chunks) => <b>{chunks}</b> })}
      </p>
      <p className="hint">{t.rich('plugSwitch', { b: (chunks) => <b>{chunks}</b> })}</p>
    </div>
  )
}
