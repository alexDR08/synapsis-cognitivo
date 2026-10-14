import './PatternPreview.css'

// Ilustración de un patrón de ejemplo: la señal recorre cuatro puntos al cargar la pantalla.
const PATH = [0, 4, 8, 5]
const center = (cell) => ({ x: (cell % 3) + 0.5, y: Math.floor(cell / 3) + 0.5 })
const STEP = 0.45 // segundos entre punto y punto

export default function PatternPreview({ className = '' }) {
  return (
    <svg className={`pp ${className}`} viewBox="0 0 3 3" role="img" aria-label="Ejemplo de patrón de puntos">
      {PATH.slice(1).map((cell, i) => {
        const from = center(PATH[i])
        const to = center(cell)
        return (
          <line
            key={cell}
            className="pp__line"
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            pathLength="1"
            style={{ animationDelay: `${0.4 + i * STEP}s` }}
          />
        )
      })}
      {Array.from({ length: 9 }, (_, cell) => {
        const { x, y } = center(cell)
        const order = PATH.indexOf(cell)
        return (
          <circle
            key={cell}
            className={`pp__node${order >= 0 ? ' is-lit' : ''}`}
            cx={x}
            cy={y}
            r="0.31"
            style={order >= 0 ? { animationDelay: `${order === 0 ? 0.3 : 0.4 + (order - 1) * STEP + 0.35}s` } : undefined}
          />
        )
      })}
    </svg>
  )
}
