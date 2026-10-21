import { useEffect, useState } from 'react'
import Glyph from './Glyph.jsx'
import './MemoryPreview.css'

// Mini tablero de ejemplo para el Inicio. Al pasar el cursor repite un ciclo corto:
// 1) se muestran todas  2) se tapan  3) un fallo  4) una pareja que se ilumina.
const CARDS = [0, 2, 1, 3, 3, 0, 2, 1, 4, 5, 5, 4] // 12 cartas = 6 parejas (índice de símbolo)
const SHAPES = ['circle', 'triangle', 'diamond', 'star', 'hexagon', 'bolt']
const PAIR = [1, 7] // posiciones de la pareja que se encuentra (símbolo 2)
const WRONG = [0, 3] // dos cartas que no coinciden

const range = (n) => Array.from({ length: n }, (_, i) => i)
const ALL = range(CARDS.length)

// Cada paso: cartas boca arriba, cartas con fallo, cartas emparejadas y cuánto dura (ms).
const STEPS = [
  { up: ALL, missed: [], matched: [], ms: 2600 },
  { up: [], missed: [], matched: [], ms: 1100 },
  { up: [WRONG[0]], missed: [], matched: [], ms: 650 },
  { up: WRONG, missed: WRONG, matched: [], ms: 1000 },
  { up: [], missed: [], matched: [], ms: 700 },
  { up: [PAIR[0]], missed: [], matched: [], ms: 650 },
  { up: PAIR, missed: [], matched: PAIR, ms: 2300 },
  { up: [], missed: [], matched: [], ms: 600 },
]
const FINAL = STEPS[6] // imagen fija cuando se piden menos animaciones

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// En reposo muestra la pareja encontrada; mientras `playing` es true repite el ciclo.
export default function MemoryPreview({ className = '', playing = false }) {
  const [still] = useState(prefersReducedMotion)
  const [step, setStep] = useState(null) // null = reposo

  useEffect(() => {
    setStep(playing && !still ? 0 : null)
  }, [playing, still])

  useEffect(() => {
    if (step === null) return undefined
    const id = setTimeout(() => setStep((s) => (s + 1) % STEPS.length), STEPS[step].ms)
    return () => clearTimeout(id)
  }, [step])

  const current = step === null ? FINAL : STEPS[step]

  return (
    <div className={`mp${step !== null ? ' is-playing' : ''} ${className}`} role="img" aria-label="Ejemplo de memorama: cartas que se voltean para formar parejas">
      {CARDS.map((symbol, i) => {
        const up = current.up.includes(i)
        const classes = [
          'mp__card',
          up && 'is-up',
          current.missed.includes(i) && 'is-missed',
          current.matched.includes(i) && 'is-matched',
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <span key={i} className={classes} style={{ '--i': i, '--c': `var(--sym-${symbol + 1})` }}>
            <span className="mp__inner">
              <span className="mp__face mp__back" />
              <span className="mp__face mp__front">
                <Glyph shape={SHAPES[symbol]} />
              </span>
            </span>
          </span>
        )
      })}
    </div>
  )
}
