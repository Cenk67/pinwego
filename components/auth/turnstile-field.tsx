"use client"

import { useEffect, useRef } from "react"

type TurnstileApi = {
  render: (node: HTMLElement, options: Record<string, unknown>) => string
  remove: (id: string) => void
}

export function TurnstileField({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) {
  const node = useRef<HTMLDivElement>(null)
  const onTokenRef = useRef(onToken)

  useEffect(() => {
    onTokenRef.current = onToken
  }, [onToken])

  useEffect(() => {
    if (!siteKey || !node.current) return
    let widget = ""
    let cancelled = false
    const render = () => {
      const api = (window as Window & { turnstile?: TurnstileApi }).turnstile
      if (!api || !node.current || cancelled || widget) return
      widget = api.render(node.current, {
        sitekey: siteKey,
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
        "error-callback": () => onTokenRef.current(""),
      })
    }
    const previous = document.querySelector<HTMLScriptElement>("script[data-turnstile]")
    if (previous) {
      if ((window as Window & { turnstile?: TurnstileApi }).turnstile) render()
      else previous.addEventListener("load", render, { once: true })
    } else {
      const script = document.createElement("script")
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      script.async = true
      script.dataset.turnstile = "1"
      script.addEventListener("load", render, { once: true })
      document.head.appendChild(script)
    }
    return () => {
      cancelled = true
      const api = (window as Window & { turnstile?: TurnstileApi }).turnstile
      if (widget && api) api.remove(widget)
    }
  }, [siteKey])

  if (!siteKey) return null
  return <div ref={node} className="min-h-16" />
}
