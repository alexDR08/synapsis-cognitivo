import { SYMBOLS } from './memory.js'

// mode: 'color'   -> forma y color distintos (el intruso salta a la vista)
//       'shape'   -> forma distinta, mismo color
//       'similar' -> forma parecida, mismo color (el más difícil)
export const ODD_LEVELS = [
  { id: 'facil', size: 3, label: 'Fácil', detail: '3×3', seconds: 45, mode: 'color' },
  { id: 'medio', size: 4, label: 'Medio', detail: '4×4', seconds: 45, mode: 'shape' },
  { id: 'dificil', size: 5, label: 'Difícil', detail: '5×5', seconds: 45, mode: 'similar' },
]

export const PENALTY_SECONDS = 3 // cada error resta este tiempo

// Pares de formas que se parecen entre sí (nivel difícil)
const SIMILAR = [
  ['circle', 'hexagon'],
  ['diamond', 'triangle'],
  ['star', 'cross'],
  ['hexagon', 'diamond'],
]

const pick = (list) => list[Math.floor(Math.random() * list.length)]
const shapes = SYMBOLS.map((s) => s.shape)
let counter = 0

/** Una ronda: cuadrícula size×size de figuras iguales (base) y una distinta (odd). */
export function buildRound(level, previousOddIndex = -1) {
  const total = level.size * level.size
  let oddIndex = Math.floor(Math.random() * total)
  if (oddIndex === previousOddIndex) oddIndex = (oddIndex + 1 + Math.floor(Math.random() * (total - 1))) % total

  const baseColor = Math.floor(Math.random() * SYMBOLS.length)
  let base
  let odd
  if (level.mode === 'similar') {
    const [a, b] = pick(SIMILAR)
    const swap = Math.random() < 0.5
    base = { shape: swap ? b : a, color: baseColor }
    odd = { shape: swap ? a : b, color: baseColor }
  } else {
    const baseShape = pick(shapes)
    const oddShape = pick(shapes.filter((s) => s !== baseShape))
    base = { shape: baseShape, color: baseColor }
    const oddColor =
      level.mode === 'color' ? (baseColor + 1 + Math.floor(Math.random() * (SYMBOLS.length - 1))) % SYMBOLS.length : baseColor
    odd = { shape: oddShape, color: oddColor }
  }
  counter += 1
  return { id: counter, size: level.size, base, odd, oddIndex }
}

// ---- Mejores marcas (por persona y por nivel, en este navegador) ----
const recordKey = (email, id) => `syn_odd_best_${email}_${id}`

export function getBest(email, id) {
  try {
    return JSON.parse(localStorage.getItem(recordKey(email, id)) || 'null')
  } catch {
    return null
  }
}

// Gana quien encuentra más intrusos; si empatan, quien cometió menos errores.
export function saveBest(email, id, result) {
  const best = getBest(email, id)
  const better =
    !best || result.found > best.found || (result.found === best.found && result.mistakes < best.mistakes)
  if (better) {
    try {
      localStorage.setItem(recordKey(email, id), JSON.stringify(result))
    } catch {
      /* sin localStorage la marca solo dura esta partida */
    }
  }
  return better && result.found > 0
}
