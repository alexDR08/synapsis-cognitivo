import Button from '../components/Button.jsx'
import HoverPanel from '../components/HoverPanel.jsx'
import MemoryPreview from '../components/MemoryPreview.jsx'
import OddPreview from '../components/OddPreview.jsx'
import PatternPreview from '../components/PatternPreview.jsx'
import { useAuth } from '../context/useAuth.js'
import { useActivitySummary } from '../hooks/useActivitySummary.js'
import { daysLabel, firstName, todayLabel } from '../lib/format.js'
import { LEVELS } from '../lib/memory.js'
import { ODD_LEVELS } from '../lib/odd.js'
import './HomeView.css'

const REASONS = [
  {
    title: 'Previenen la fatiga',
    text: 'Desconectar 5 minutos reactiva la agudeza mental sin que pierdas el hilo de lo que estudias.',
  },
  {
    title: 'Mejoran la atención',
    text: 'Los retos breves reinician el ciclo de concentración y ayudan a retener mejor lo aprendido.',
  },
  {
    title: 'Devuelven la calma',
    text: 'Cambiar el foco al juego disipa la tensión y deja la mente clara para tareas complejas.',
  },
]

function StreakChip() {
  const { status, data } = useActivitySummary()
  if (status !== 'ok') return null // sin Firestore o sin respuesta: no se muestra nada

  const { current, best, playedToday } = data.streak
  let text
  if (current > 0 && playedToday) text = `Racha de ${daysLabel(current)}`
  else if (current > 0) text = `Racha de ${daysLabel(current)} · juega hoy para mantenerla`
  else text = best > 0 ? `Tu mejor racha fue de ${daysLabel(best)} · empieza otra hoy` : 'Juega hoy para empezar tu racha'

  return (
    <p className={`streak${current > 0 && playedToday ? ' is-lit' : ''}`}>
      <i className="streak__dot" aria-hidden="true" />
      {text}
    </p>
  )
}

export default function HomeView() {
  const { user } = useAuth()

  return (
    <>
      <header className="greet">
        <p className="muted">{todayLabel()}</p>
        <h1>Hola, {firstName(user)}</h1>
        <p className="greet__lead">Cinco minutos de memoria antes de volver a tus tareas.</p>
        <StreakChip />
      </header>

      <HoverPanel className="hero" aria-labelledby="hero-title">
        {(playing) => (
          <>
            <div className="hero__text">
              <p className="hero__tag">Memoria de trabajo</p>
              <h2 id="hero-title">Secuencia de patrones</h2>
              <p>
                Mira cómo se encienden los puntos, memoriza el orden y repítelo igual. Nivel medio,
                unos 5 minutos.
              </p>
              <Button to="/juego" variant="spark">
                Empezar ronda
              </Button>
              <p className="hero__score">
                Aciertos acumulados: <strong>{user.score}</strong>
              </p>
            </div>
            <PatternPreview className="hero__preview" playing={playing} />
          </>
        )}
      </HoverPanel>

      <HoverPanel className="hero hero--memory" aria-labelledby="memory-title">
        {(playing) => (
          <>
            <MemoryPreview className="hero__preview" playing={playing} />
            <div className="hero__text">
              <p className="hero__tag">Memoria visual</p>
              <h2 id="memory-title">Memorama</h2>
              <p>
                Mira dónde está cada carta, memoriza sus posiciones antes de que se volteen y encuentra
                todas las parejas con los menos movimientos.
              </p>
              <ul className="chips" aria-label="Niveles y tiempo para memorizar">
                {LEVELS.map((level) => (
                  <li key={level.pairs}>
                    <strong>{level.label}</strong> {level.memorizeSeconds} s
                  </li>
                ))}
              </ul>
              <Button to="/memorama" variant="spark">
                Jugar memorama
              </Button>
            </div>
          </>
        )}
      </HoverPanel>

      <HoverPanel className="hero hero--odd" aria-labelledby="odd-title">
        {(playing) => (
          <>
            <div className="hero__text">
              <p className="hero__tag">Atención visual</p>
              <h2 id="odd-title">Intruso visual</h2>
              <p>
                Entre decenas de figuras casi iguales hay una distinta. Encuéntrala antes de que se acabe
                el tiempo: cada error te quita 3 segundos.
              </p>
              <ul className="chips" aria-label="Niveles">
                {ODD_LEVELS.map((level) => (
                  <li key={level.id}>
                    <strong>{level.label}</strong> {level.detail}
                  </li>
                ))}
              </ul>
              <Button to="/intruso" variant="spark">
                Jugar intruso
              </Button>
            </div>
            <OddPreview className="hero__preview" playing={playing} />
          </>
        )}
      </HoverPanel>

      <section className="why" aria-labelledby="why-title">
        <h2 id="why-title">Por qué conviene hacer pausas</h2>
        <div className="why__list">
          {REASONS.map((reason) => (
            <article key={reason.title}>
              <h3>{reason.title}</h3>
              <p className="muted">{reason.text}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
