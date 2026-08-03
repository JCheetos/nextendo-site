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
        {FEATURES.map((feature, idx) => (
          <article
            key={feature.key}
            className={`cell cell--feature${idx === 0 ? ' cell--lead' : ''}`}
            data-spotlight
          >
            <i className={`ph ${feature.icon} cell__ico`} aria-hidden="true" />
            <h3>{t(`feat.${feature.key}.h`)}</h3>
            <p>{t(`feat.${feature.key}.p`)}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
