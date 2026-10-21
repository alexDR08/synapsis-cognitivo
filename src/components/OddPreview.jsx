import { useEffect, useState } from 'react'
import Glyph from './Glyph.jsx'
import './OddPreview.css'

// Mini tablero del Inicio. Al pasar el cursor, tres rondas seguidas: aparece la cuadrícula,
// un marcador recorre algunas figuras y termina en el intruso, que se ilumina.
const SIZE = 4
const ROUNDS = [
  { base: 'circle', odd: 'hexagon', color: 2, at: 6 },
  { base: 'triangle', odd: 'diamond', color: 4, at: 11 },
  { base: 'star', odd: 'cross', color: 5, at: 2 },
]
const SCAN = [13, 0, 9] // casillas por las que pasa el marcador antes de llegar al intruso

const STEPS = ROUNDS.flatMap((_, round) => [
  { round, kind: 'in', ms: 800 },
  ...SCAN.map((at) => ({ round, kind: 'scan', at, ms: 220 })),
  { round, kind: 'scan', at: ROUNDS[round].at, ms: 260 },
  { round, kind: 'found', ms: 1700 },
])
const REST = { round: 0, kind: 'found' } // imagen fija cuando no se reproduce

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export default function OddPreview({ className = '', playing = false }) {
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

  const current = step === null ? REST : STEPS[step]
  const round = ROUNDS[current.round]
  const found = current.kind === 'found'

  return (
    <div
      className={`mo${step !== null ? ' is-playing' : ''}${found ? ' is-found' : ''}${current.kind === 'in' ? ' is-in' : ''} ${className}`}
      role="img"
      aria-label="Ejemplo de intruso visual: una figura distinta entre muchas iguales"
    >
      {Array.from({ length: SIZE * SIZE }, (_, i) => {
        const odd = i === round.at
        const classes = ['mo__tile', odd && found && 'is-odd', current.kind === 'scan' && current.at === i && 'is-scan']
          .filter(Boolean)
          .join(' ')
        return (
          <span key={i} className={classes}>
            <span
              key={current.round}
              className="mo__glyph"
              style={{ color: `var(--sym-${round.color})`, '--i': i }}
            >
              <Glyph shape={odd ? round.odd : round.base} />
            </span>
          </span>
        )
      })}
    </div>
  )
}
