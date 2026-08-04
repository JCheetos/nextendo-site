import { getTranslations } from 'next-intl/server'

const STEPS = [
  { key: 'step1', hasLink: true },
  { key: 'step2', hasLink: false },
  { key: 'step3', hasLink: false },
  { key: 'step4', hasLink: false },
] as const

export async function Install() {
  const t = await getTranslations()
  return (
    <section className="section shell" id="install" aria-labelledby="install-title">
      <div className="install">
        <div className="install__left">
          <header className="head head--left">
            <h2 className="head__title" id="install-title">
              {t('install.title')}
            </h2>
            <p className="head__lede">{t('install.lede')}</p>
          </header>

          <div className="member-card">
            <div className="member-card__top">
              <span className="member-card__brand">
                <img src="/favicon.svg" alt="" width={18} height={18} />
                NEXTENDO
              </span>
              <span className="member-card__chip">{t('member.chip')}</span>
            </div>
            <div className="member-card__label">{t('member.label')}</div>
            <div className="member-card__code">SW-4815-1623-0842</div>
            <div className="member-card__foot">
              <div className="member-card__name">
                Inkling_Pro<span>{t('member.pseudo')}</span>
              </div>
              <div className="member-card__sig" aria-hidden="true" />
            </div>
          </div>

          <p className="hint">{t('install.hint')}</p>
        </div>

        <ol className="steps">
          {STEPS.map((step, idx) => {
            const n = String(idx + 1).padStart(2, '0')
            // step3.p contains <b>...</b> tags (e.g. "Dans Ryujinx : <b>Actions →
            // Connexion Nextendo Network</b>, puis entrez vos identifiants.") —
            // use t.rich() so the placeholder is rendered as <b>...</b> in the
            // browser. Other steps have plain text and ignore the `b`
            // parameter, so passing it uniformly is safe.
            return (
              <li key={step.key} className="step">
                <span className="step__n mono">{n}</span>
                <div>
                  <h3>{t(`${step.key}.h`)}</h3>
                  <p>
                    {t.rich(`${step.key}.p`, {
                      b: (chunks) => <b>{chunks}</b>,
                    })}{' '}
                    {step.hasLink ? (
                      <a href="/register" style={{ color: 'var(--primary-bright)' }}>
                        {t(`${step.key}.link`)}
                      </a>
                    ) : null}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
