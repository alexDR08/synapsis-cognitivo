import './NeuronBoard.css'

const COLUMNS = 3
const center = (cell) => ({
  x: (cell % COLUMNS) + 0.5,
  y: Math.floor(cell / COLUMNS) + 0.5,
})

/**
 * Tablero 3x3 de "neuronas". Los puntos se encienden en ámbar (la señal) y una línea
 * une cada punto con el anterior, como un impulso viajando entre neuronas.
 * - lit: punto encendido ahora   - tapped: punto que la persona acaba de tocar
 * - bad: punto equivocado        - trail: puntos ya conectados
 * - celebrate: una ola de luz recorre el tablero (acierto)
 */
export default function NeuronBoard({ lit, tapped, bad, trail, trailTone, locked, celebrate = false, onTap }) {
  return (
    <div className={`nb${celebrate ? ' nb--won' : ''}`}>
      <div className="nb__inner">
        <svg className={`nb__trail nb__trail--${trailTone}`} viewBox="0 0 3 3" aria-hidden="true">
          {trail.slice(1).map((cell, i) => {
            const from = center(trail[i])
            const to = center(cell)
            return (
              <line
                key={`${i}-${trail[i]}-${cell}`}
                className="nb__line"
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                pathLength="1"
              />
            )
          })}
        </svg>

        <div className="nb__grid">
          {Array.from({ length: COLUMNS * COLUMNS }, (_, cell) => {
            const state = [
              lit === cell && 'is-lit',
              tapped === cell && 'is-tap',
              bad === cell && 'is-bad',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <div className="nb__slot" key={cell}>
                <button
                  type="button"
                  className={`nb__node ${state}`}
                  aria-label={`Punto ${cell + 1}`}
                  aria-disabled={locked}
                  style={{ '--d': `${((cell % COLUMNS) + Math.floor(cell / COLUMNS)) * 70}ms` }}
                  onClick={() => onTap(cell)}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
