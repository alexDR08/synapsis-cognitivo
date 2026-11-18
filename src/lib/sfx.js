// Sonidos de la interfaz sintetizados con Web Audio (sin archivos).
// Se activan solo tras un gesto del usuario; el silencio se recuerda en localStorage.

const KEY = 'synapsis_sfx'
let ctx = null
let muted = false
const listeners = new Set()

try {
  muted = localStorage.getItem(KEY) === 'off'
} catch {
  /* sin almacenamiento: se queda activado */
}

function audio() {
  if (ctx) return ctx
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null
  ctx = new Ctor()
  return ctx
}

// Una nota: frecuencia, inicio (s), duración (s), onda y volumen
function tone(c, freq, at, dur, type = 'sine', vol = 0.16) {
  const o = c.createOscillator()
  const g = c.createGain()
  const t0 = c.currentTime + at
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g).connect(c.destination)
  o.start(t0)
  o.stop(t0 + dur + 0.05)
}

function play(fn) {
  if (muted) return
  const c = audio()
  if (!c) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  try {
    fn(c)
  } catch {
    /* un sonido nunca debe romper el juego */
  }
}

export const sfx = {
  // acierto: dos notas que suben
  ok: () => play((c) => {
    tone(c, 660, 0, 0.14, 'triangle')
    tone(c, 880, 0.09, 0.2, 'triangle')
  }),
  // fallo: tono grave que baja
  fail: () => play((c) => {
    tone(c, 260, 0, 0.18, 'sawtooth', 0.09)
    tone(c, 180, 0.12, 0.28, 'sawtooth', 0.09)
  }),
  // juego completado: arpegio brillante
  complete: () => play((c) => {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(c, f, i * 0.11, 0.3, 'triangle', 0.15))
    tone(c, 1319, 0.5, 0.5, 'sine', 0.12)
  }),
}

export function isMuted() {
  return muted
}

export function setMuted(value) {
  muted = value
  try {
    localStorage.setItem(KEY, value ? 'off' : 'on')
  } catch {
    /* ignorar */
  }
  listeners.forEach((fn) => fn())
  if (!value) sfx.ok() // confirmación al reactivar (ocurre dentro de un clic)
}

export function subscribeMuted(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
