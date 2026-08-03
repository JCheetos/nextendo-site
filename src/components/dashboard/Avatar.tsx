// Avatar helpers — shared by AccountHeader, MemberCard, FriendsPanel,
// HistoryPanel, FriendModal. Server-safe (no DOM access, no hooks).

const RE_B64 = /^[A-Za-z0-9+/=\s]*$/

export function safeImageSrc(b64: string | undefined | null): string {
  const v = String(b64 ?? '')
  if (!v) return ''
  if (v.startsWith('data:image/')) {
    const c = v.indexOf(',')
    if (c > 0 && RE_B64.test(v.slice(c + 1))) return v
    return ''
  }
  return RE_B64.test(v) ? `data:image/jpeg;base64,${v}` : ''
}

export function isValidColor(color: string | undefined | null): color is string {
  return typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color)
}

export function safeAssetUrl(payload: string | undefined | null): string {
  // `img:/path/to/asset` resolves under /assets/ ; bare payloads under /assets/avatars/.
  if (!payload) return ''
  if (payload.startsWith('img:')) {
    const path = payload.slice(4)
    return path.includes('/') ? `/assets/${path}` : `/assets/avatars/${path}`
  }
  return ''
}

export function initial(name: string | undefined | null): string {
  const trimmed = String(name ?? '').trim()
  return (trimmed.charAt(0) || '?').toUpperCase()
}

type Props = {
  image?: string | unknown | null
  avatar?: string | unknown | null
  color?: string | unknown | null
  name?: string | unknown | null
  alt?: string
}

export function Avatar({ image, avatar, color, name, alt = '' }: Props) {
  const src = safeImageSrc(typeof image === 'string' ? image : null)
  if (src) {
    return <img src={src} alt={alt} />
  }
  const av = String(typeof avatar === 'string' ? avatar : '')
  if (av.startsWith('img:')) {
    const url = safeAssetUrl(av)
    if (url) {
      return <img src={url} alt={alt} />
    }
  }
  if (av.startsWith('ph-')) {
    return <i className={`ph ${av}`} aria-hidden="true" />
  }
  const cStr = typeof color === 'string' ? color : null
  const style = isValidColor(cStr) ? { background: cStr, color: 'transparent' } : undefined
  return (
    <span style={style} aria-hidden={alt ? undefined : true}>
      {initial(typeof name === 'string' ? name : null)}
    </span>
  )
}
