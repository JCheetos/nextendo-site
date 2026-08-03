'use client'

import { Modal } from '@/components/dashboard/Modal'
import { putProfile } from '@/lib/api'
import { useTranslations } from 'next-intl'
import { useEffect, useId, useRef, useState, useTransition } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  username: string
  currentColor: string | null
  currentImage: string | null
}

const SWATCH_COLORS = [
  '#1ca9e0',
  '#e4404a',
  '#36ce73',
  '#8b5cf6',
  '#f59e0b',
  '#ec4899',
  '#14b8a6',
  '#eab308',
  '#6366f1',
  '#ef7c3a',
  '#22d3ee',
  '#64748b',
]
const DEF_COLOR = '#1ca9e0'

type Layer = 'char' | 'bg' | 'frame'

export function EditProfileModal({ open, onClose, username, currentColor, currentImage }: Props) {
  const titleId = useId()
  const t = useTranslations('ed')
  const tForm = useTranslations('form')
  const tAuth = useTranslations('auth.errors')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [color, setColor] = useState<string>(currentColor ?? DEF_COLOR)
  const [hue, setHue] = useState(200)
  const [sv, setSV] = useState({ s: 1, v: 1 })
  const [pickerOpen, setPickerOpen] = useState(false)
  const [layer, setLayer] = useState<Layer>('char')
  const [bg, setBg] = useState<string | null>(null)
  const [char, setChar] = useState<string | null>(null)
  const [frame, setFrame] = useState<string | null>(null)
  const [manifest, setManifest] = useState<{
    byCat: Record<string, Record<string, string[]>>
    games: Array<{ id: string; name: string }>
  } | null>(null)
  const [firmware, setFirmware] = useState<{ avatars: string[] }>({ avatars: [] })
  const [gameFilter, setGameFilter] = useState('')
  const [pending, start] = useTransition()
  const [serverErr, setServerErr] = useState<string | null>(null)
  const [_image, setImage] = useState<string | null>(currentImage)
  const [dirty, setDirty] = useState(false)

  // Init image once when opening
  useEffect(() => {
    if (open && !dirty) {
      setImage(currentImage)
      setColor(currentColor ?? DEF_COLOR)
    }
  }, [open, currentColor, currentImage, dirty])

  // Load icon manifests on mount
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [mf, fw] = await Promise.all([
          fetch('/assets/icons/manifest.json', { cache: 'no-cache' })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch('/assets/avatars/manifest.json', { cache: 'no-cache' })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ])
        if (cancelled) return
        setManifest(mf ?? { byCat: {}, games: [] })
        setFirmware(fw ?? { avatars: [] })
      } catch {
        if (!cancelled) {
          setManifest({ byCat: {}, games: [] })
          setFirmware({ avatars: [] })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Redraw canvas when state changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    void drawAvatar(ctx, { color, bg, char, frame })
  }, [color, bg, char, frame])

  const drawAvatar = async (
    ctx: CanvasRenderingContext2D,
    e: { color: string; bg: string | null; char: string | null; frame: string | null },
  ) => {
    ctx.clearRect(0, 0, 256, 256)
    ctx.fillStyle = e.color
    ctx.fillRect(0, 0, 256, 256)
    for (const layer of [e.bg, e.char, e.frame]) {
      if (!layer) continue
      const img = await loadImg(assetUrl(layer))
      if (img) ctx.drawImage(img, 0, 0, 256, 256)
    }
  }

  const onPickSwatch = (c: string) => {
    if (pickerOpen) {
      // also set hue/sv from c
      const rgb = hexToRgb(c)
      if (rgb) {
        const [h, s, v] = rgbToHsv(rgb[0], rgb[1], rgb[2])
        setHue(h)
        setSV({ s, v })
      }
    } else {
      setColor(c)
      setDirty(true)
    }
  }

  const onTogglePicker = () => {
    if (!pickerOpen) {
      const rgb = hexToRgb(color)
      if (rgb) {
        const [h, s, v] = rgbToHsv(rgb[0], rgb[1], rgb[2])
        setHue(h)
        setSV({ s, v })
      }
    }
    setPickerOpen(!pickerOpen)
  }

  useEffect(() => {
    if (!pickerOpen) return
    const rgb = hsvToRgb(hue, sv.s, sv.v)
    const hex = `#${rgb.map((x) => x.toString(16).padStart(2, '0')).join('')}`
    setColor(hex)
    setDirty(true)
  }, [hue, sv, pickerOpen])

  const onLayerPick = (item: string) => {
    setDirty(true)
    if (layer === 'char') setChar(item)
    if (layer === 'bg') setBg(item)
    if (layer === 'frame') setFrame(item)
  }

  const onClearLayer = () => {
    setDirty(true)
    if (layer === 'char') setChar(null)
    if (layer === 'bg') setBg(null)
    if (layer === 'frame') setFrame(null)
  }

  const onSave = async () => {
    setServerErr(null)
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    const b64 = dataUrl.split(',')[1] ?? ''
    start(async () => {
      const r = await putProfile({ name: username, color, image: b64 })
      if (r.ok) {
        setImage(b64)
        onClose()
      } else {
        setServerErr(tAuth(r.error))
      }
    })
  }

  // Build icon picker list
  const cat = layer === 'char' ? 'characters' : layer === 'bg' ? 'backgrounds' : 'frames'
  const map = manifest?.byCat?.[cat] ?? {}
  const gameList = manifest?.games ?? []
  const gameIds = Object.keys(map).sort(
    (a, b) =>
      gameList.findIndex((g) => g.id === a) + 0 - (gameList.findIndex((g) => g.id === b) + 0),
  )
  const items =
    gameFilter && map[gameFilter] ? map[gameFilter] : gameIds.flatMap((gid) => map[gid] ?? [])
  const fwAvatars = firmware.avatars ?? []

  return (
    <Modal open={open} onClose={onClose} titleId={titleId} className="modal__panel--editor">
      <div className="modal__head">
        <h2 id={titleId}>{t('title')}</h2>
        <button type="button" className="modal__x" onClick={onClose} aria-label={tForm('close')}>
          <i className="ph ph-x" aria-hidden="true" />
        </button>
      </div>
      <div className="modal__body">
        <div className="editor">
          <div className="editor__preview">
            <canvas ref={canvasRef} width={256} height={256} aria-label={t('previewAria')} />
            <span>{t('preview')}</span>
          </div>
          <div className="editor__controls">
            <div className="fld">
              <label htmlFor="edit-pseudo">{t('pseudo')}</label>
              <input
                id="edit-pseudo"
                className="input"
                maxLength={16}
                defaultValue={username}
                autoComplete="off"
                onChange={(e) => {
                  /* pseudo change goes through username endpoint in future */
                  e.target.value
                }}
              />
              <span className="fld__hint">{t('pseudoHint')}</span>
            </div>
            <div className="fld">
              <span className="lbl">{t('bgColor')}</span>
              <div className="swatches" data-testid="color-swatches">
                {SWATCH_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`swatch${color.toLowerCase() === c ? ' sel' : ''}`}
                    style={{ background: c }}
                    title={c}
                    onClick={() => onPickSwatch(c)}
                  />
                ))}
                <button
                  type="button"
                  className="swatch swatch--custom"
                  title={t('customColor' as never)}
                  onClick={onTogglePicker}
                >
                  <i className="ph ph-sliders-horizontal" aria-hidden="true" />
                </button>
              </div>
              <div className="cpick" hidden={!pickerOpen}>
                <div
                  className="cpick__sv"
                  style={{ ['--ch' as never]: hue.toFixed(0) }}
                  onPointerDown={(e) => {
                    const target = e.currentTarget
                    const update = (clientX: number, clientY: number) => {
                      const r = target.getBoundingClientRect()
                      const s = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
                      const v = 1 - Math.min(1, Math.max(0, (clientY - r.top) / r.height))
                      setSV({ s, v })
                    }
                    update(e.clientX, e.clientY)
                    const move = (ev: PointerEvent) => update(ev.clientX, ev.clientY)
                    target.setPointerCapture(e.pointerId)
                    target.addEventListener('pointermove', move)
                    const up = () => {
                      target.removeEventListener('pointermove', move)
                      target.removeEventListener('pointerup', up)
                    }
                    target.addEventListener('pointerup', up)
                  }}
                >
                  <div
                    className="cpick__sv-thumb"
                    style={{ left: `${sv.s * 100}%`, top: `${(1 - sv.v) * 100}%` }}
                  />
                </div>
                <div
                  className="cpick__hue"
                  onPointerDown={(e) => {
                    const target = e.currentTarget
                    const update = (clientX: number) => {
                      const r = target.getBoundingClientRect()
                      const h = Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * 360
                      setHue(h)
                    }
                    update(e.clientX)
                    const move = (ev: PointerEvent) => update(ev.clientX)
                    target.setPointerCapture(e.pointerId)
                    target.addEventListener('pointermove', move)
                    const up = () => {
                      target.removeEventListener('pointermove', move)
                      target.removeEventListener('pointerup', up)
                    }
                    target.addEventListener('pointerup', up)
                  }}
                >
                  <div className="cpick__hue-thumb" style={{ left: `${(hue / 360) * 100}%` }} />
                </div>
                <div className="cpick__row">
                  <span className="cpick__prev" style={{ background: color }} aria-hidden="true" />
                  <input
                    className="input cpick__hex"
                    maxLength={7}
                    spellCheck={false}
                    value={color.toUpperCase()}
                    onChange={(e) => {
                      const rgb = hexToRgb(e.target.value)
                      if (rgb) {
                        const [h, s, v] = rgbToHsv(rgb[0], rgb[1], rgb[2])
                        setHue(h)
                        setSV({ s, v })
                        setColor(e.target.value)
                        setDirty(true)
                      }
                    }}
                    aria-label={t('hexAria')}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="icon-picker">
          <div className="modal__sub">
            {t.rich('photoSub', {
              span: (chunks) => <span className="ip-hint"> — {chunks}</span>,
            })}
          </div>
          <div className="ip-head">
            <div className="ip-tabs" id="ip-tabs">
              <LayerTab
                active={layer === 'char'}
                onClick={() => setLayer('char')}
                icon="ph-user"
                label={t('layerChar')}
                has={!!char}
              />
              <LayerTab
                active={layer === 'bg'}
                onClick={() => setLayer('bg')}
                icon="ph-image"
                label={t('layerBg')}
                has={!!bg}
              />
              <LayerTab
                active={layer === 'frame'}
                onClick={() => setLayer('frame')}
                icon="ph-frame-corners"
                label={t('layerFrame')}
                has={!!frame}
              />
            </div>
            <div className="ip-head__r">
              {char || bg || frame ? (
                <button type="button" className="ip-clear" id="ip-clear" onClick={onClearLayer}>
                  <i className="ph ph-x" aria-hidden="true" />
                  <span>{t('remove')}</span>
                </button>
              ) : null}
              <select
                className="input ip-game"
                value={gameFilter}
                onChange={(e) => setGameFilter(e.target.value)}
                aria-label={t('filterGame')}
              >
                <option value="">—</option>
                {gameIds.map((gid) => (
                  <option key={gid} value={gid}>
                    {gameList.find((g) => g.id === gid)?.name ?? gid}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="avatar-grid ip-grid" id="avatar-grid">
            {items.map((item, i) => {
              const key = `m-${i}-${item.slice(0, 16)}`
              return (
                <AvatarOpt
                  key={key}
                  item={item}
                  isSelected={
                    (layer === 'char' && char === item) ||
                    (layer === 'bg' && bg === item) ||
                    (layer === 'frame' && frame === item)
                  }
                  onClick={() => onLayerPick(item)}
                />
              )
            })}
            {fwAvatars.map((item, i) => {
              const key = `fw-${i}-${item.slice(0, 16)}`
              return (
                <AvatarOpt
                  key={key}
                  item={item}
                  isSelected={
                    (layer === 'char' && char === item) ||
                    (layer === 'bg' && bg === item) ||
                    (layer === 'frame' && frame === item)
                  }
                  onClick={() => onLayerPick(item)}
                />
              )
            })}
          </div>
        </div>

        {serverErr ? (
          <output className="msg msg--err" role="alert" style={{ marginTop: '0.6rem' }}>
            {serverErr}
          </output>
        ) : null}
      </div>
      <div className="modal__foot">
        <button type="button" className="btn btn--soft" onClick={onClose}>
          {tForm('cancel')}
        </button>
        <button
          type="button"
          className="btn btn--primary"
          id="save-profile"
          onClick={onSave}
          disabled={pending}
          aria-busy={pending}
        >
          {t('save')}
        </button>
      </div>
    </Modal>
  )
}

function LayerTab({
  active,
  onClick,
  icon,
  label,
  has,
}: {
  active: boolean
  onClick: () => void
  icon: string
  label: string
  has: boolean
}) {
  return (
    <button
      type="button"
      className={`ip-tab${active ? ' on' : ''}${has ? ' has' : ''}`}
      onClick={onClick}
    >
      <i className={`ph ${icon}`} aria-hidden="true" />
      <span>{label}</span>
      <i className="ph ph-check-circle ip-tab__dot" aria-hidden="true" />
    </button>
  )
}

function AvatarOpt({
  item,
  isSelected,
  onClick,
}: {
  item: string
  isSelected: boolean
  onClick: () => void
}) {
  const url = assetUrl(item)
  return (
    <button
      type="button"
      className={`avatar-opt avatar-opt--img${isSelected ? ' sel' : ''}`}
      onClick={onClick}
      aria-label={item}
    >
      <img src={url} alt="" />
    </button>
  )
}

function assetUrl(payload: string): string {
  if (!payload) return ''
  if (payload.startsWith('img:')) {
    const path = payload.slice(4)
    return path.includes('/') ? `/assets/${path}` : `/assets/avatars/${path}`
  }
  return ''
}

const _imgCache = new Map<string, HTMLImageElement | null>()
function loadImg(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null)
  if (_imgCache.has(src)) return Promise.resolve(_imgCache.get(src) ?? null)
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      _imgCache.set(src, img)
      resolve(img)
    }
    img.onerror = () => {
      _imgCache.set(src, null)
      resolve(null)
    }
    img.src = src
  })
}

function hexToRgb(h: string): [number, number, number] | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec((h ?? '').trim())
  if (!m) return null
  const n = Number.parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rN = r / 255
  const gN = g / 255
  const bN = b / 255
  const mx = Math.max(rN, gN, bN)
  const mn = Math.min(rN, gN, bN)
  const d = mx - mn
  let h = 0
  if (d) {
    if (mx === rN) h = ((gN - bN) / d) % 6
    else if (mx === gN) h = (bN - rN) / d + 2
    else h = (rN - gN) / d + 4
    h = (h * 60 + 360) % 360
  }
  return [h, mx ? d / mx : 0, mx]
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let a: [number, number, number]
  if (h < 60) a = [c, x, 0]
  else if (h < 120) a = [x, c, 0]
  else if (h < 180) a = [0, c, x]
  else if (h < 240) a = [0, x, c]
  else if (h < 300) a = [x, 0, c]
  else a = [c, 0, x]
  return a.map((z) => Math.round((z + m) * 255)) as [number, number, number]
}
