// Red neuronal SIMULADA del usuario ("Mi neurona").
// Aún no sale de datos reales: parte de una base fija y se personaliza con los aciertos del usuario.
// Cada neurona tiene progreso (0-100) y estrés (0-100).

export const GROUPS = {
  juegos: { label: 'Juegos', anchor: [0.2, 0.5] },
  habilidades: { label: 'Habilidades', anchor: [0.55, 0.3] },
  bienestar: { label: 'Bienestar', anchor: [0.82, 0.68] },
}

// p: progreso base, s: estrés base (0-1)
const BASE = [
  { id: 'secuencia', exercise: 'Repetir patrones de 5 puntos sin apoyarte en los dedos.', to: '/juego', label: 'Secuencia', group: 'juegos', p: 0.62, s: 0.3, text: 'Tu juego de patrones. Cada ronda correcta refuerza la memoria de trabajo.' },
  { id: 'memorama', exercise: 'Memoriza el tablero 10 s y encuentra las parejas con menos movimientos.', to: '/memorama', label: 'Memorama', group: 'juegos', p: 0.48, s: 0.4, text: 'Entrena la memoria visual: recordar dónde está cada carta fortalece sus conexiones.' },
  { id: 'intruso', exercise: 'Una ronda de 45 s buscando la figura distinta.', to: '/intruso', label: 'Intruso', group: 'juegos', p: 0.55, s: 0.55, text: 'Bajo presión de tiempo. Es el juego que más activa tu atención, y también el que más cansa.' },
  { id: 'memtrabajo', exercise: 'Repite al revés una secuencia de 5 números que alguien te diga.', to: '/juego', label: 'Memoria de trabajo', group: 'habilidades', p: 0.66, s: 0.35, text: 'Sostener varias cosas en mente a la vez. Se entrena con rondas cortas y frecuentes.' },
  { id: 'memvisual', exercise: 'Mira un cuarto 10 s, cierra los ojos y nombra 5 objetos.', to: '/memorama', label: 'Memoria visual', group: 'habilidades', p: 0.5, s: 0.3, text: 'Recordar posiciones y formas. Mejora con práctica repetida y buen descanso.' },
  { id: 'atencion', exercise: 'Encuentra el intruso sin dejar que el error te frene.', to: '/intruso', label: 'Atención', group: 'habilidades', p: 0.58, s: 0.6, text: 'Filtrar distracciones para encontrar lo importante. El estrés alto la apaga primero.' },
  { id: 'concentracion', exercise: 'Trabaja 25 minutos en una sola tarea y descansa 5.', to: '/intruso', label: 'Concentración', group: 'habilidades', p: 0.52, s: 0.5, text: 'Mantener la atención en el tiempo. Se agota si no haces pausas.' },
  { id: 'calma', exercise: 'Respiración 4-4-6 durante 1 minuto.', to: null, label: 'Calma', group: 'bienestar', p: 0.4, s: 0.22, text: 'Tu capacidad de soltar la tensión. Respirar hondo la fortalece.' },
  { id: 'sueno', exercise: 'Apaga pantallas 30 minutos antes de dormir.', to: null, label: 'Sueño', group: 'bienestar', p: 0.45, s: 0.65, text: 'Mientras duermes, el cerebro consolida lo que aprendiste. Dormir poco sube el estrés de toda la red.' },
  { id: 'pausas', exercise: 'Estírate y mira lejos 2 minutos cada 45 de estudio.', to: null, label: 'Pausas', group: 'bienestar', p: 0.7, s: 0.2, text: 'Descansos breves entre tareas. Son la razón de ser de esta app.' },
  { id: 'racha', exercise: 'Juega una ronda corta hoy para mantener la constancia.', to: '/juego', label: 'Racha', group: 'bienestar', p: 0.35, s: 0.3, text: 'Constancia diaria. Jugar un poco cada día pesa más que mucho de vez en cuando.' },
]

export const LINKS = [
  ['secuencia', 'memtrabajo'],
  ['memorama', 'memvisual'],
  ['intruso', 'atencion'],
  ['memtrabajo', 'concentracion'],
  ['memvisual', 'memtrabajo'],
  ['atencion', 'concentracion'],
  ['atencion', 'memvisual'],
  ['concentracion', 'calma'],
  ['calma', 'sueno'],
  ['calma', 'pausas'],
  ['pausas', 'racha'],
  ['sueno', 'memtrabajo'],
  ['sueno', 'atencion'],
  ['racha', 'secuencia'],
  ['racha', 'memorama'],
  ['pausas', 'concentracion'],
]

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}

function rng(seed) {
  let a = seed || 1
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v))

// Misma persona -> misma red. Más aciertos acumulados -> más progreso.
export function buildNetwork(seedKey = 'invitado', score = 0) {
  const rand = rng(hash(String(seedKey)))
  const boost = Math.min(25, Math.sqrt(Math.max(0, score)) * 3)
  return BASE.map((n) => ({
    id: n.id,
    label: n.label,
    group: n.group,
    text: n.text,
    exercise: n.exercise,
    to: n.to,
    reps: Math.round(clamp(n.p * 7 * 0.7 + (rand() - 0.5) * 4, 0, 7)),
    progress: Math.round(clamp(n.p * 100 + boost + (rand() - 0.5) * 18, 8, 98)),
    stress: Math.round(clamp(n.s * 100 + (rand() - 0.5) * 26, 5, 95)),
  }))
}

export function networkLevel(avgProgress) {
  if (avgProgress >= 80) return { name: 'Constelación', next: null }
  if (avgProgress >= 60) return { name: 'Red activa', next: 80 }
  if (avgProgress >= 40) return { name: 'Brote', next: 60 }
  return { name: 'Semilla', next: 40 }
}

export function stressLabel(s) {
  if (s >= 66) return 'Alto'
  if (s >= 36) return 'Medio'
  return 'Bajo'
}

// azul (calma) -> ámbar -> coral (estrés)
const CALM = [111, 150, 220]
const MID = [255, 202, 80]
const HIGH = [255, 107, 90]

export function stressColor(s, alpha = 1) {
  const t = clamp(s, 0, 100) / 100
  const [a, b, f] = t < 0.5 ? [CALM, MID, t / 0.5] : [MID, HIGH, (t - 0.5) / 0.5]
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * f))
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`
}

// Mensaje de Chispa (solo texto) según el estado de la red o de la neurona elegida.
export function chispaAdvice(node, nodes) {
  if (node) {
    if (node.stress >= 66) return { pose: 'pensando', text: `${node.label} está muy tensa. Respira hondo y tómate una pausa antes de seguir entrenándola.` }
    if (node.progress >= 75) return { pose: 'celebrando', text: `¡${node.label} va muy bien! Mantén la constancia para no perder lo ganado.` }
    if (node.progress < 40) return { pose: 'pesas', text: `${node.label} apenas está creciendo. Unas rondas cortas cada día la harán despegar.` }
    return { pose: 'senalando', text: `${node.label} avanza a buen ritmo. Entrénala con calma y descansa entre rondas.` }
  }
  const worst = [...nodes].sort((a, b) => b.stress - a.stress)[0]
  const avg = nodes.reduce((s, n) => s + n.stress, 0) / nodes.length
  if (avg >= 55) return { pose: 'pensando', text: `Tu red anda algo tensa, sobre todo ${worst.label}. Prueba una pausa de respiración.` }
  return { pose: 'senalando', text: 'Toca una neurona para ver cómo va. Entrenar sube el progreso; respirar baja el estrés.' }
}

// Rutina de gimnasia cerebral: las 3 neuronas que menos has ejercitado (poco progreso y pocas sesiones).
export function dailyRoutine(nodes) {
  return [...nodes]
    .sort((a, b) => a.progress + a.reps * 6 - (b.progress + b.reps * 6))
    .slice(0, 3)
}

export const WEEK_GOAL = 5 // sesiones por neurona a la semana

// Red vacía: la persona aún no ha jugado. Todas las neuronas están dormidas.
export function buildEmptyNetwork() {
  return BASE.map((n) => ({
    id: n.id,
    label: n.label,
    group: n.group,
    text: n.text,
    exercise: n.exercise,
    to: n.to,
    reps: 0,
    progress: 0,
    stress: 0,
  }))
}

// Juego que despierta cada neurona (las de bienestar se despiertan jugando cualquiera).
export const WAKE_GAMES = [
  { to: '/juego', label: 'Secuencia de patrones', wakes: 'Memoria de trabajo', pose: 'pensando' },
  { to: '/memorama', label: 'Memorama', wakes: 'Memoria visual', pose: 'estudiando' },
  { to: '/intruso', label: 'Intruso visual', wakes: 'Atención', pose: 'pesas' },
]

export function emptyMessage(firstVisit, node, name) {
  if (node) {
    const game = node.to ? WAKE_GAMES.find((g) => g.to === node.to) : null
    return {
      pose: 'senalando',
      text: game
        ? `${node.label} sigue dormida. Juega ${game.label} y verás cómo se enciende.`
        : `${node.label} despierta cuando entrenas el resto de la red. Empieza con cualquier juego.`,
      to: game?.to ?? '/juego',
    }
  }
  return {
    pose: 'celebrando',
    text: firstVisit
      ? `¡Hola${name ? `, ${name}` : ''}! Esta es tu neurona, pero todavía duerme. Juega una ronda y empezará a encenderse.`
      : 'Tu neurona sigue en silencio: aún no hay partidas. Juega una ronda corta y la despiertas.',
    to: '/juego',
  }
}
