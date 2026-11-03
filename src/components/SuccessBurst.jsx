import './SuccessBurst.css'

const SPARKS = 12

/**
 * Alerta de acierto: insignia con palomita que se dibuja, anillos que se expanden y
 * destellos que salen disparados. Va sobre el tablero (el contenedor debe ser position: relative).
 * Es decorativa (aria-hidden): el anuncio para lector de pantalla lo hace la línea de estado.
 */
export default function SuccessBurst({ title, subtitle, note, variant = 'round' }) {
  return (
    <div className={`burst burst--${variant}`} aria-hidden="true">
      <div className="burst__card">
        <div className="burst__mark">
          <i className="burst__ring" />
          <i className="burst__ring burst__ring--late" />
          {Array.from({ length: SPARKS }, (_, i) => (
            <i key={i} className="burst__spark" style={{ '--a': `${i * (360 / SPARKS)}deg` }} />
          ))}
          <svg className="burst__badge" viewBox="0 0 52 52">
            <circle className="burst__disc" cx="26" cy="26" r="24" />
            <path className="burst__tick" d="M15 27.5l8 8 15-18" />
          </svg>
        </div>
        <p className="burst__title">{title}</p>
        {subtitle && <p className="burst__sub">{subtitle}</p>}
        {note && <p className="burst__note">{note}</p>}
      </div>
    </div>
  )
}
