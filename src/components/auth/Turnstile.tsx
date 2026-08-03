'use client'

import { useId, useRef } from 'react'

type Props = {
  sitekey?: string
  onToken?: (token: string) => void
}

// Render-only Turnstile mount. Server Actions consume the token via the
// `Cf-Turnstile-Response` header in the form's submit handler. The widget
// is omitted if no sitekey is configured (fail-open, like the legacy).
export function Turnstile({ sitekey, onToken }: Props) {
  const id = useId()
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  if (!sitekey) return null

  // Turnstile renders into a div with class `cf-turnstile`. The widget calls
  // a global callback when the token is ready; we wire it here.
  const callbackName = `nxTurnstileCb_${id.replace(/[:]/g, '_')}`
  const tokenHolderId = `nx-turnstile-token-${id.replace(/[:]/g, '_')}`

  // Wire the global callback exactly once per mount.
  if (typeof window !== 'undefined') {
    ;(window as unknown as Record<string, unknown>)[callbackName] = (token: string) => {
      onTokenRef.current?.(token)
    }
  }

  return (
    <>
      <div
        id={tokenHolderId}
        className="cf-turnstile"
        data-sitekey={sitekey}
        data-callback={callbackName}
      />
      {/* Turnstile script — loaded once per page. */}
      <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
    </>
  )
}
