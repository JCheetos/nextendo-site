'use client'

import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  open: boolean
  onClose: () => void
  titleId?: string
  className?: string
  children?: React.ReactNode
  closeOnBackdrop?: boolean
}

// IMPORTANT: We deliberately do NOT use the native <dialog> element.
//
// The native <dialog> moves itself to the top layer when `showModal()` is
// called, which breaks author CSS such as `position: fixed; inset: 0`. The
// legacy HTML site uses a plain `<div class="modal" hidden>` and shows it
// via CSS instead; we mirror that here so our centered, backdrop-covered
// layout matches the visual parity promised to users.
//
// We render via createPortal into document.body so the modal is not trapped
// inside an ancestor with `transform`, `filter`, or `backdrop-filter` (those
// would establish a containing block for `position: fixed`). The portal
// also keeps the modal out of the page's stacking context so it always
// renders above all content, regardless of any z-index set on the route's
// own sections.
export function Modal({
  open,
  onClose,
  titleId,
  className,
  children,
  closeOnBackdrop = true,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const lastFocusedRef = useRef<HTMLElement | null>(null)
  // Defer the portal render to client mount because document.body is not
  // available during SSR. The modal remains declarative after that point.
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !open) return
    const el = ref.current
    if (!el) return

    lastFocusedRef.current = (document.activeElement as HTMLElement) ?? null
    const focusable = el.querySelector<HTMLElement>(
      'input, textarea, select, button, a[href], [tabindex]:not([tabindex="-1"])',
    )
    if (focusable) focusable.focus()
    else el.focus()
    document.body.dataset.modalOpen = 'true'

    return () => {
      lastFocusedRef.current?.focus?.()
      delete document.body.dataset.modalOpen
    }
  }, [open, mounted])

  useEffect(() => {
    const el = ref.current
    if (!mounted || !el || !open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'Tab') {
        const focusables = Array.from(
          el.querySelectorAll<HTMLElement>(
            'input, textarea, select, button, a[href], [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((node) => !node.hasAttribute('disabled'))
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (e.shiftKey && active === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, mounted])

  const onBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!closeOnBackdrop) return
    if (e.target === e.currentTarget) onClose()
  }

  if (!mounted || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="modal"
      data-open={open}
      onClick={onBackdrop}
      onKeyDown={() => {
        // Keyboard equivalent is handled globally via the Escape listener in
        // the useEffect above; the backdrop click is mouse-only by design.
      }}
    >
      <div
        className="modal__backdrop"
        aria-hidden="true"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClose()
          }
        }}
      />
      <div className={cn('modal__panel', className)}>{children}</div>
    </div>,
    document.body,
  )
}
