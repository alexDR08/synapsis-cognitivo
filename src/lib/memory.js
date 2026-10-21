// Símbolos del memorama. El número coincide con --sym-N en tokens.css y con la forma en Glyph.jsx.
export const SYMBOLS = [
  { shape: 'circle', name: 'círculo', color: 'ámbar' },
  { shape: 'triangle', name: 'triángulo', color: 'azul' },
  { shape: 'diamond', name: 'rombo', color: 'verde azulado' },
  { shape: 'star', name: 'estrella', color: 'coral' },
  { shape: 'hexagon', name: 'hexágono', color: 'violeta' },
  { shape: 'bolt', name: 'rayo', color: 'celeste' },
  { shape: 'moon', name: 'luna', color: 'rosa' },
  { shape: 'cross', name: 'cruz', color: 'verde' },
]

// memorizeSeconds: cuánto tiempo se muestran las cartas antes de taparlas. A mayor dificultad, menos tiempo.
export const LEVELS = [
  { id: 'facil', pairs: 4, label: 'Fácil', detail: '4 parejas', memorizeSeconds: 10 },
  { id: 'medio', pairs: 6, label: 'Medio', detail: '6 parejas', memorizeSeconds: 7 },
  { id: 'dificil', pairs: 8, label: 'Difícil', detail: '8 parejas', memorizeSeconds: 5 },
]

function shuffle(list) {
  const items = [...list]
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

// Baraja `pairs` parejas distintas: cada carta es { id, symbol }.
export function buildDeck(pairs) {
  const symbols = shuffle(SYMBOLS.map((_, index) => index)).slice(0, pairs)
  return shuffle(symbols.flatMap((symbol) => [{ id: `${symbol}-a`, symbol }, { id: `${symbol}-b`, symbol }]))
}

export function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

// ---- Mejores marcas (se guardan en este navegador, por persona y por nivel) ----
const recordKey = (email, pairs) => `syn_memory_best_${email}_${pairs}`

export function getBest(email, pairs) {
  try {
    return JSON.parse(localStorage.getItem(recordKey(email, pairs)) || 'null')
  } catch {
    return null
  }
}

// Gana quien termina con menos movimientos; si empatan, quien tarda menos.
// Devuelve true si el resultado nuevo es la mejor marca.
export function saveBest(email, pairs, result) {
  const best = getBest(email, pairs)
  const better =
    !best ||
    result.moves < best.moves ||
    (result.moves === best.moves && result.seconds < best.seconds)
  if (better) {
    try {
      localStorage.setItem(recordKey(email, pairs), JSON.stringify(result))
    } catch {
      /* sin localStorage la marca solo dura esta partida */
    }
  }
  return better
}
