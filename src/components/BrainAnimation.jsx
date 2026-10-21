import './BrainAnimation.css'

// Neuronas dentro de la silueta y las sinapsis que las unen.
const NODES = [
  [70, 96], [100, 70], [136, 56], [170, 68], [196, 98],
  [160, 104], [122, 98], [92, 124], [130, 134], [174, 130],
]

const LINKS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [1, 6], [6, 5], [5, 3], [5, 4],
  [0, 7], [7, 6], [6, 8], [8, 9], [9, 4], [5, 9], [7, 8], [2, 6],
]

const OUTLINE =
  'M60 150 C30 145 20 115 30 95 C22 70 40 45 65 45 C75 25 105 18 125 28 ' +
  'C145 15 180 22 190 45 C215 50 228 80 215 100 C228 120 215 150 190 150 ' +
  'C180 165 155 168 140 158 C130 170 105 172 95 160 C85 165 68 162 60 150 Z'

const FOLDS = [
  'M55 70 C70 75 75 90 65 105',
  'M95 40 C100 55 90 65 98 80',
  'M140 32 C135 45 150 52 145 68',
  'M185 55 C175 65 190 78 182 90',
  'M205 115 C190 112 185 125 192 138',
  'M45 125 C60 120 72 130 70 145',
  'M110 150 C112 140 125 138 130 148',
  'M150 85 C160 92 175 88 180 80',
  'M85 100 C95 108 110 105 112 115',
]

const path = ([a, b]) => `M${NODES[a][0]} ${NODES[a][1]} L${NODES[b][0]} ${NODES[b][1]}`

export default function BrainAnimation({ className = '' }) {
  return (
    <svg className={`brain ${className}`} viewBox="0 0 240 200" aria-hidden="true">
      <g className="brain__shape">
        <path className="brain__outline" d={OUTLINE} />
        <path className="brain__stem" d="M140 158 C143 172 141 184 136 196" />
        {FOLDS.map((d) => (
          <path key={d} className="brain__fold" d={d} />
        ))}
      </g>

      {LINKS.map((link) => (
        <path key={`l${link}`} className="brain__link" d={path(link)} />
      ))}

      {LINKS.map((link, i) => (
        <path
          key={`p${link}`}
          className="brain__pulse"
          d={path(link)}
          pathLength="100"
          style={{ '--delay': `${(i * 0.37) % 3}s` }}
        />
      ))}

      {NODES.map(([x, y], i) => (
        <circle
          key={`${x}-${y}`}
          className="brain__node"
          cx={x}
          cy={y}
          r="4"
          style={{ '--delay': `${(i * 0.53) % 3}s` }}
        />
      ))}
    </svg>
  )
}
