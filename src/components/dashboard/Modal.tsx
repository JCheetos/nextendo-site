'use client'

import { cn } from '@/lib/utils'
import { useEffect, useRef } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  titleId?: string
  className?: string
  children?: React.ReactNode
  closeOnBackdrop?: boolean
}

// Lightweight <dialog>-based modal. The native element handles focus trap,
// Escape-to-close, and returning focus to the opener. We only need to wire
// the backdrop click and the sync between `open` and `dialog.open`.
export function Modal({
  open,
  onClose,
  titleId,
  className,
  children,
  closeOnBackdrop = true,
}: Props) {
  const ref = useRef<HTMLDialogElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) {
      el.showModal()
      // Move focus to the first interactive element (or the dialog itself).
      const focusable = el.querySelector<HTMLElement>(
        'input, textarea, select, button, a[href], [tabindex]:not([tabindex="-1"])',
      )
      if (focusable) focusable.focus()
      else el.focus()
    } else if (!open && el.open) {
      el.close()
    }
  }, [open])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onCancel = (e: Event) => {
      e.preventDefault()
      onClose()
    }
    el.addEventListener('cancel', onCancel)
    return () => el.removeEventListener('cancel', onCancel)
  }, [onClose])

  const onBackdrop = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (!closeOnBackdrop) return
    if (e.target === ref.current) onClose()
  }

  return (
    <dialog
      ref={ref}
      className={cn('modal', className)}
      aria-labelledby={titleId}
      onClick={onBackdrop}
      onKeyDown={(e) => {
        // The native <dialog> handles Escape → close via the browser; we
        // forward to onClose so the React state can sync. Don't bubble
        // Enter/Space here — those activate focused controls inside the
        // panel (e.g. submit buttons, menu items).
        if (e.key === 'Escape') {
          e.preventDefault()
          onClose()
        }
      }}
    >
      <div className="modal__backdrop" aria-hidden="true" />
      <div className="modal__panel">{children}</div>
    </dialog>
  )
}
