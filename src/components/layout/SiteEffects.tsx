'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Site-wide client effects ported from the legacy vanilla-JS site.
 *
 * - Canvas signal field (drifting node mesh with travelling pulses)
 *   Init runs only when #nx-mesh exists in the DOM.
 * - Scroll reveal: [data-reveal] elements fade-in on intersection.
 *   Falls back to "all revealed" if the observer never fires.
 * - Spotlight: [data-spotlight] elements get a CSS var pointer track.
 * - Magnetic CTA: .btn--primary pulls subtly toward the pointer.
 * - Stuck nav: #nav gets the .stuck class when the user scrolls past 8px.
 * - Mobile menu: #burger toggles .open on #navlinks.
 * - Footer year: writes the current year into #year if present.
 *
 * Honors prefers-reduced-motion: animations are skipped, single frames
 * rendered, and magnetic/spotlight effects are disabled.
 */
export function SiteEffects() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return

    const root = document.documentElement
    if (!root.classList.contains('js')) root.classList.add('js')

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const prefersFine = window.matchMedia('(pointer: fine)').matches

    const cleanups: Array<() => void> = []

    /* ---- Footer year ---- */
    const yearEl = document.getElementById('year')
    if (yearEl) yearEl.textContent = String(new Date().getFullYear())

    /* ---- Canvas signal field ---- */
    const meshEl = document.getElementById('nx-mesh') as HTMLCanvasElement | null
    if (meshEl) {
      cleanups.push(createMesh(meshEl, { density: 9000, linkDist: 132 }))
    }

    /* ---- Stuck nav (sticky background on scroll) ---- */
    const nav = document.getElementById('nav')
    if (nav) {
      const onScroll = () => {
        nav.classList.toggle('stuck', window.scrollY > 8)
      }
      onScroll()
      window.addEventListener('scroll', onScroll, { passive: true })
      cleanups.push(() => window.removeEventListener('scroll', onScroll))
    }

    /* ---- Mobile menu ---- */
    const burger = document.getElementById('burger')
    const navlinks = document.getElementById('navlinks')
    if (burger && navlinks) {
      const toggle = (open?: boolean) => {
        const next = open ?? !navlinks.classList.contains('open')
        navlinks.classList.toggle('open', next)
        burger.setAttribute('aria-expanded', String(next))
      }
      const onBurger = () => toggle()
      burger.addEventListener('click', onBurger)
      const linkHandlers: Array<() => void> = []
      for (const a of navlinks.querySelectorAll('a')) {
        const handler = () => toggle(false)
        a.addEventListener('click', handler)
        linkHandlers.push(() => a.removeEventListener('click', handler))
      }
      cleanups.push(() => {
        burger.removeEventListener('click', onBurger)
        for (const f of linkHandlers) f()
      })
    }

    /* ---- Scroll reveal ---- */
    const revealEls = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    const revealAll = () => {
      for (const el of revealEls) el.classList.add('in')
    }
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealAll()
    } else {
      const ro = new IntersectionObserver(
        (entries, obs) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              e.target.classList.add('in')
              obs.unobserve(e.target)
            }
          }
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
      )
      for (const el of revealEls) ro.observe(el)
      // Safety net: never let content stay hidden if the observer never fires.
      const safety = setTimeout(revealAll, 1400)
      cleanups.push(() => {
        ro.disconnect()
        clearTimeout(safety)
      })
    }

    /* ---- Spotlight on [data-spotlight] ---- */
    const cells = Array.from(document.querySelectorAll<HTMLElement>('[data-spotlight]'))
    const spotlightHandlers: Array<() => void> = []
    for (const cell of cells) {
      const onMove = (ev: Event) => {
        const e = ev as PointerEvent
        if (e.pointerType === 'touch') return
        const rect = cell.getBoundingClientRect()
        cell.style.setProperty('--mx', `${e.clientX - rect.left}px`)
        cell.style.setProperty('--my', `${e.clientY - rect.top}px`)
      }
      cell.addEventListener('pointermove', onMove)
      spotlightHandlers.push(() => cell.removeEventListener('pointermove', onMove))
    }
    cleanups.push(() => {
      for (const f of spotlightHandlers) f()
    })

    /* ---- Magnetic CTA on .btn--primary ---- */
    if (prefersFine && !reduceMotion) {
      const btns = Array.from(
        document.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>('.btn--primary'),
      )
      const rafs: Array<() => void> = []
      for (const btn of btns) {
        let tx = 0
        let ty = 0
        let cx = 0
        let cy = 0
        let frameId = 0
        const render = () => {
          cx += (tx - cx) * 0.18
          cy += (ty - cy) * 0.18
          btn.style.transform = `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px)`
          if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) {
            frameId = requestAnimationFrame(render)
          } else {
            frameId = 0
          }
        }
        const kick = () => {
          if (!frameId) frameId = requestAnimationFrame(render)
        }
        const onMove = (ev: Event) => {
          const e = ev as PointerEvent
          const r = btn.getBoundingClientRect()
          tx = (e.clientX - (r.left + r.width / 2)) * 0.22
          ty = (e.clientY - (r.top + r.height / 2)) * 0.3
          kick()
        }
        const onLeave = () => {
          tx = 0
          ty = 0
          kick()
        }
        btn.addEventListener('pointermove', onMove)
        btn.addEventListener('pointerleave', onLeave)
        rafs.push(() => {
          btn.removeEventListener('pointermove', onMove)
          btn.removeEventListener('pointerleave', onLeave)
          if (frameId) cancelAnimationFrame(frameId)
          btn.style.transform = ''
        })
      }
      cleanups.push(() => {
        for (const f of rafs) f()
      })
    }

    return () => {
      for (const f of cleanups) {
        try {
          f()
        } catch {
          // noop
        }
      }
    }
  }, [pathname])

  return null
}

type MeshOptions = {
  density?: number
  linkDist?: number
  accentEvery?: number
}

function createMesh(canvas: HTMLCanvasElement, opts: MeshOptions = {}): () => void {
  const rawCtx = canvas.getContext('2d')
  if (!rawCtx) return () => {}
  const ctx: CanvasRenderingContext2D = rawCtx

  const density = opts.density ?? 9000
  const linkDist = opts.linkDist ?? 132
  const accentEvery = opts.accentEvery ?? 7

  let nodes: Array<{
    x: number
    y: number
    vx: number
    vy: number
    r: number
    accent: boolean
    pulse: number
    pulseSpeed: number
  }> = []
  let w = 0
  let h = 0
  let raf = 0

  const css = getComputedStyle(document.documentElement)
  const primary = (css.getPropertyValue('--primary') || 'oklch(0.73 0.115 222)').trim()
  const accent = (css.getPropertyValue('--accent') || 'oklch(0.8 0.115 78)').trim()

  function resize() {
    const rect = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    w = Math.max(1, rect.width)
    h = Math.max(1, rect.height)
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    seed()
  }

  function seed() {
    const count = Math.max(6, Math.min(72, Math.round((w * h) / density)))
    nodes = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      r: Math.random() * 1.4 + 1,
      accent: i % accentEvery === 0,
      pulse: Math.random(),
      pulseSpeed: 0.0016 + Math.random() * 0.0022,
    }))
  }

  function withAlpha(color: string, a: string | number) {
    if (color.startsWith('oklch')) return color.replace(/\)\s*$/, ` / ${a})`)
    return color
  }

  function frame() {
    ctx.clearRect(0, 0, w, h)
    for (const n of nodes) {
      n.x += n.vx
      n.y += n.vy
      if (n.x < 0 || n.x > w) n.vx *= -1
      if (n.y < 0 || n.y > h) n.vy *= -1
      n.x = Math.max(0, Math.min(w, n.x))
      n.y = Math.max(0, Math.min(h, n.y))
      n.pulse += n.pulseSpeed
      if (n.pulse > 1) n.pulse -= 1
    }
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i]
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const d = Math.hypot(dx, dy)
        if (d > linkDist) continue
        const t = 1 - d / linkDist
        ctx.strokeStyle = withAlpha(primary, (0.16 * t).toFixed(3))
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
        if (t > 0.55) {
          const p = a.pulse
          const px = a.x + (b.x - a.x) * p
          const py = a.y + (b.y - a.y) * p
          ctx.fillStyle = withAlpha(a.accent ? accent : primary, (0.5 * t).toFixed(3))
          ctx.beginPath()
          ctx.arc(px, py, 1.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    for (const n of nodes) {
      const col = n.accent ? accent : primary
      ctx.fillStyle = withAlpha(col, '0.9')
      ctx.shadowColor = withAlpha(col, '0.6')
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }
  }

  function loop() {
    frame()
    raf = requestAnimationFrame(loop)
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  resize()
  if (reduceMotion) {
    frame()
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            if (!raf) loop()
          } else {
            cancelAnimationFrame(raf)
            raf = 0
          }
        }
      },
      { threshold: 0 },
    )
    io.observe(canvas)
  }

  let rt: ReturnType<typeof setTimeout> | undefined
  const onResize = () => {
    if (rt) clearTimeout(rt)
    rt = setTimeout(resize, 180)
  }
  window.addEventListener('resize', onResize)

  return () => {
    cancelAnimationFrame(raf)
    if (rt) clearTimeout(rt)
    window.removeEventListener('resize', onResize)
  }
}
