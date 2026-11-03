import { SYMBOLS } from '../lib/memory.js'
import Glyph from './Glyph.jsx'
import './MemoryCard.css'

/**
 * stage: 'dealing' | 'preview' | 'hiding' | 'playing' (fase del juego).
 * order: posición de la carta, se usa para escalonar las animaciones.
 */
export default function MemoryCard({ position, order, symbol, faceUp, matched, missed, stage, onFlip }) {
  const { shape, name, color } = SYMBOLS[symbol]
  const label = faceUp
    ? `Carta ${position}: ${name} ${color}${matched ? ', pareja encontrada' : ''}`
    : `Carta ${position}, boca abajo`

  const classes = [
    'mc',
    `mc--${stage}`,
    faceUp && 'is-up',
    matched && 'is-matched',
    missed && 'is-missed',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={classes}
      style={{ '--i': order }}
      aria-label={label}
      disabled={matched || stage !== 'playing'}
      onClick={onFlip}
    >
      <span className="mc__inner">
        <span className="mc__face mc__back" />
        <span className="mc__face mc__front" style={{ color: `var(--sym-${symbol + 1})` }}>
          <Glyph shape={shape} className="mc__glyph" />
        </span>
      </span>
    </button>
  )
}
