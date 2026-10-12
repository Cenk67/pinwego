export type SpeechErrorCode = "denied" | "no-mic" | "nothing" | "unclear" | "network" | "api" | "aborted"

type SpeechResult = { isFinal: boolean; 0: { transcript: string } }

type SpeechEvent = {
  resultIndex: number
  results: ArrayLike<SpeechResult>
}

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike
  webkitSpeechRecognition?: new () => SpeechRecognitionLike
}

export function mapSpeechError(code: string): SpeechErrorCode {
  if (code === "not-allowed" || code === "service-not-allowed") return "denied"
  if (code === "audio-capture") return "no-mic"
  if (code === "network") return "network"
  if (code === "no-speech") return "nothing"
  if (code === "aborted") return "aborted"
  return "unclear"
}

function recognitionCtor() {
  if (typeof window === "undefined") return null
  const host = window as SpeechWindow
  return host.SpeechRecognition || host.webkitSpeechRecognition || null
}

export function browserSupportsSpeech() {
  return recognitionCtor() !== null
}

export type ListenOptions = {
  lang: string
  maxSeconds: number
  onTranscript: (text: string) => void
  onEnd: (text: string) => void
  onError: (code: SpeechErrorCode) => void
  onTick: (seconds: number) => void
}

export function listen(options: ListenOptions) {
  const Ctor = recognitionCtor()
  if (!Ctor) {
    options.onError("api")
    return { stop: () => undefined, cancel: () => undefined }
  }
  const recognition = new Ctor()
  recognition.lang = options.lang
  recognition.continuous = false
  recognition.interimResults = true
  let latest = ""
  let mode: "live" | "finish" | "cancel" | "done" = "live"
  const started = Date.now()
  const limit = Math.min(60, Math.max(5, options.maxSeconds))
  const tick = setInterval(() => {
    options.onTick(Math.floor((Date.now() - started) / 1000))
  }, 250)
  const cap = setTimeout(() => stop(), limit * 1000)

  function clearTimers() {
    clearInterval(tick)
    clearTimeout(cap)
  }

  function finishOnce(text: string) {
    if (mode === "done" || mode === "cancel") return
    mode = "done"
    clearTimers()
    const clean = text.trim().slice(0, 240)
    if (!clean) options.onError("nothing")
    else options.onEnd(clean)
  }

  recognition.onresult = (event) => {
    let finalText = ""
    let interim = ""
    for (let index = 0; index < event.results.length; index += 1) {
      const piece = event.results[index][0]?.transcript ?? ""
      if (event.results[index].isFinal) finalText += piece
      else interim += piece
    }
    latest = `${finalText}${interim}`.replace(/\s+/g, " ").trim().slice(0, 240)
    options.onTranscript(latest)
  }
  recognition.onerror = (event) => {
    if (mode !== "live") return
    const code = mapSpeechError(event.error)
    if (code === "aborted") return
    mode = "done"
    clearTimers()
    options.onError(code === "unclear" && !latest ? "nothing" : code)
  }
  recognition.onend = () => {
    if (mode === "cancel" || mode === "done") return
    finishOnce(latest)
  }

  function stop() {
    if (mode === "done" || mode === "cancel") return
    mode = "finish"
    try {
      recognition.stop()
    } catch {
      finishOnce(latest)
    }
  }

  function cancel() {
    if (mode === "done") return
    mode = "cancel"
    clearTimers()
    try {
      recognition.abort()
    } catch {
      /* already closed */
    }
  }

  try {
    recognition.start()
  } catch {
    mode = "done"
    clearTimers()
    options.onError("api")
  }

  return { stop, cancel }
}
