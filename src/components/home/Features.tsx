import { getTranslations } from 'next-intl/server'

const FEATURES = [
  { key: 'accounts', icon: 'ph-identification-card' },
  { key: 'online', icon: 'ph-globe-hemisphere-west' },
  { key: 'friends', icon: 'ph-users-three' },
  { key: 'community', icon: 'ph-hand-heart' },
  { key: 'privacy', icon: 'ph-shield-check' },
] as const

export async function Features() {
  const t = await getTranslations()
  return (
    <section className="section shell" id="features" aria-labelledby="features-title">
      <header className="head">
        <h2 className="head__title" id="features-title">
          {t('features.title')}
        </h2>
        <p className="head__lede">{t('features.lede')}</p>
      </header>

      <div className="bento">
        {FEATURES.map((feature, idx) => {
          const isLead = idx === 0
          const inner = (
            <>
              <i className={`ph ${feature.icon} cell__ico`} aria-hidden="true" />
              <h3>{t(`feat.${feature.key}.h`)}</h3>
              <p>{t(`feat.${feature.key}.p`)}</p>
            </>
          )
          return (
            <article
              key={feature.key}
              className={`cell cell--feature${isLead ? ' cell--lead' : ''}`}
              data-spotlight
            >
              {isLead ? <div className="cell__body">{inner}</div> : inner}
            </article>
          )
        })}
      </div>
    </section>
  )
}
