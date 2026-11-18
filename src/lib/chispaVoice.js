// Voz de Chispa con la voz en español del dispositivo (Web Speech API).
// Es un almacén externo pequeño: la UI se suscribe con useChispaVoice().
// Por ahora no hay clips grabados; si se añaden, bastaría reproducirlos aquí.

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'

let state = { speaking: false, text: '' }
const listeners = new Set()
let session = 0
let progress = 0 // 0-1: avance estimado dentro del texto
let startedAt = 0
let estimateMs = 1

function emit(next) {
  state = next
  listeners.forEach((fn) => fn())
}

const NEURAL = /natural|online|neural|google/i
const FEMALE = /sabina|paulina|helena|laura|dalia|elena|luc[ií]a|marisol|camila|salome|catalina|female|mujer/i

function pickVoice() {
  const list = window.speechSynthesis.getVoices().filter((v) => /^es/i.test(v.lang))
  const score = (v) => (NEURAL.test(v.name) ? 4 : 0) + (FEMALE.test(v.name) ? 2 : 0) + (/es[-_](MX|US|419)/i.test(v.lang) ? 1 : 0)
  return list.sort((a, b) => score(b) - score(a))[0] ?? null
}

export function stop() {
  session += 1
  progress = 0
  if (supported) window.speechSynthesis.cancel()
  if (state.speaking) emit({ speaking: false, text: '' })
}

export function speak(text) {
  if (!supported) return false
  stop()
  const mine = session
  const voice = pickVoice()
  const nice = voice && NEURAL.test(voice.name)
  // frases cortas: suena menos monótono y evita cortes de Chrome en textos largos
  const parts = (text.match(/[^.!?]+[.!?]*/g) || [text]).map((p) => p.trim()).filter(Boolean)
  let offset = 0
  startedAt = performance.now()
  estimateMs = text.length * 62 + 600
  progress = 0
  emit({ speaking: true, text })

  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part)
    const base = offset
    offset += part.length + 1
    u.lang = voice ? voice.lang : 'es-MX'
    if (voice) u.voice = voice
    u.rate = (nice ? 1 : 1.03) + (part.includes('!') ? 0.04 : 0)
    u.pitch = (nice ? 1.12 : 1.22) + (part.includes('?') ? 0.08 : 0) // un poco aguda y alegre
    u.onboundary = (e) => {
      if (mine === session) progress = Math.min(1, (base + (e.charIndex || 0)) / text.length)
    }
    const end = () => {
      if (mine === session) stop()
    }
    if (i === parts.length - 1) {
      u.onend = end
      u.onerror = end
    }
    window.speechSynthesis.speak(u)
  })
  return true
}

// Avance 0-1 de lo que se está diciendo (para sincronizar la boca)
export function getProgress() {
  if (!state.speaking) return 1
  return progress > 0 ? progress : Math.min(1, (performance.now() - startedAt) / estimateMs)
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getState() {
  return state
}

export const voiceSupported = supported
