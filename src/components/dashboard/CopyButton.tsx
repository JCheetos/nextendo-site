'use client'

import { useState } from 'react'

type Props = {
  value: string
  label: string
}

export function CopyButton({ value, label }: Props) {
  const [copied, setCopied] = useState(false)

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard denied — leave silently
    }
  }

  return (
    <button type="button" className="copy-btn" onClick={onClick} aria-live="polite">
      {copied ? '✓' : label}
    </button>
  )
}
