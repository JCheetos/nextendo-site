import { getTranslations } from 'next-intl/server'

export async function Architecture() {
  const t = await getTranslations()
  return (
    <section className="section shell" id="architecture" aria-labelledby="arch-title">
      <header className="head">
        <h2 className="head__title" id="arch-title">
          {t('arch.title')}
        </h2>
        <p className="head__lede">{t('arch.lede')}</p>
      </header>

      <div className="flow">
        <div className="node">
          <i className="ph ph-game-controller node__ico" aria-hidden="true" />
          <h3>{t('arch.game.h')}</h3>
          <p>{t('arch.game.p')}</p>
        </div>

        <div className="wire" aria-hidden="true">
          <span className="wire__pulse" />
        </div>

        <div className="node node--key">
          <i className="ph ph-identification-card node__ico" aria-hidden="true" />
          <h3>{t('arch.account.h')}</h3>
          <p>{t('arch.account.p')}</p>
        </div>

        <div className="wire" aria-hidden="true">
          <span className="wire__pulse wire__pulse--2" />
        </div>

        <div className="node">
          <i className="ph ph-users-three node__ico" aria-hidden="true" />
          <h3>{t('arch.match.h')}</h3>
          <p>{t('arch.match.p')}</p>
        </div>
      </div>
    </section>
  )
}
