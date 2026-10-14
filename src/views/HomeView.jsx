import Button from '../components/Button.jsx'
import PatternPreview from '../components/PatternPreview.jsx'
import { useAuth } from '../context/useAuth.js'
import { firstName, todayLabel } from '../lib/format.js'
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

export default function HomeView() {
  const { user } = useAuth()

  return (
    <>
      <header className="greet">
        <p className="muted">{todayLabel()}</p>
        <h1>Hola, {firstName(user)}</h1>
        <p className="greet__lead">Cinco minutos de memoria antes de volver a tus tareas.</p>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__text">
          <h2 id="hero-title">Secuencia de patrones</h2>
          <p>
            Mira cómo se encienden los puntos, memoriza el orden y repítelo igual. Nivel medio, unos
            5 minutos.
          </p>
          <Button to="/juego" variant="spark">
            Empezar ronda
          </Button>
          <p className="hero__score">
            Aciertos acumulados: <strong>{user.score}</strong>
          </p>
        </div>
        <PatternPreview className="hero__preview" />
      </section>

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
