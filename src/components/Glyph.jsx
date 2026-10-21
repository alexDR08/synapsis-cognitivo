// Formas del memorama (viewBox 24x24). Toman el color del texto (currentColor).
const SHAPES = {
  circle: (
    <>
      <circle cx="12" cy="12" r="8.5" fill="none" strokeWidth="3" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  triangle: <path d="M12 3.5 21.5 20h-19z" />,
  diamond: <path d="M12 2 22 12 12 22 2 12z" />,
  star: <path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6-5.9-3.3-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />,
  hexagon: <path d="m12 2.5 8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z" />,
  bolt: <path d="M13.5 2 4.5 13.5H11l-1 8.5 9-11.5h-6.5z" />,
  moon: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />,
  cross: <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />,
}

export default function Glyph({ shape, className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {SHAPES[shape]}
    </svg>
  )
}
