import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Glyph from '../components/Glyph.jsx'
import SuccessBurst from '../components/SuccessBurst.jsx'
import { logEvent } from '../api/activity.js'
import { useAuth } from '../context/useAuth.js'
import { useOddGame } from '../hooks/useOddGame.js'
import { SYMBOLS } from '../lib/memory.js'
import { ODD_LEVELS, PENALTY_SECONDS, getBest } from '../lib/odd.js'
import './OddView.css'

export default function OddView() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [level, setLevel] = useState(null)
  const [round, setRound] = useState(0) // al cambiar, la partida se vuelve a montar

  if (level) {
    return (
      <OddRound
        key={round}
        level={level}
        email={user.email}
        onAgain={() => setRound((r) => r + 1)}
        onLevels={() => setLevel(null)}
      />
    )
  }

  return (
    <div className="game">
      <div className="game__bar">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          Salir
        </Button>
      </div>

      <h1 className="memory__title">Intruso visual</h1>
      <p className="muted memory__lead">
        Entre muchas figuras iguales hay una distinta. Encuéntrala y toca; en 45 segundos, ¿cuántas
        logras? Cada error te quita {PENALTY_SECONDS} segundos.
      </p>

      <ul className="levels">
        {ODD_LEVELS.map((item) => {
          const best = getBest(user.email, item.id)
          return (
            <li key={item.id}>
              <button type="button" className="levels__item" onClick={() => {
                  logEvent('level_selected', { game: 'odd', level: item.id })
                  setLevel(item)
                }}>
                <span>
                  <strong>{item.label}</strong>
                  <span className="muted levels__detail">
                    Cuadrícula {item.detail} · {item.seconds} s
                  </span>
                </span>
                <span className="muted levels__best">
                  {best ? `Mejor: ${best.found} intrusos` : 'Sin marca todavía'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function OddRound({ level, email, onAgain, onLevels }) {
  const navigate = useNavigate()
  const game = useOddGame(level, email)
  const { round } = game
  const seconds = Math.ceil(game.msLeft / 1000)
  const low = game.phase === 'playing' && seconds <= 10

  return (
    <div className="game">
      <div className="game__bar">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          Salir
        </Button>
        <p className="muted">
          {level.label} · Intrusos: <strong>{game.found}</strong>
        </p>
      </div>

      <div className={`otime${low ? ' is-low' : ''}`}>
        <div className="otime__row">
          <span className="otime__label">Tiempo</span>
          <span className="otime__secs">
            {seconds} s
            {game.penalty && (
              <span className="otime__penalty" aria-hidden="true">
                −{PENALTY_SECONDS} s
              </span>
            )}
          </span>
        </div>
        <div className="otime__track" aria-hidden="true">
          <span className="otime__fill" style={{ transform: `scaleX(${game.msLeft / game.totalMs})` }} />
        </div>
      </div>

      <div className="mwrap">
        <div
          className={`oboard${game.phase === 'countdown' ? ' is-waiting' : ''}`}
          style={{ '--n': round.size }}
        >
          {Array.from({ length: round.size * round.size }, (_, index) => {
            const isOdd = index === round.oddIndex
            const fig = isOdd ? round.odd : round.base
            const classes = [
              'oc',
              game.hit === index && 'is-hit',
              game.wrong === index && 'is-wrong',
              game.phase === 'over' && isOdd && 'is-reveal',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <button
                key={index}
                type="button"
                className={classes}
                aria-label={`Figura ${index + 1}: ${SYMBOLS.find((s) => s.shape === fig.shape).name} ${SYMBOLS[fig.color].color}`}
                disabled={game.phase !== 'playing'}
                onClick={() => game.tap(index)}
              >
                <span
                  key={round.id}
                  className="oc__glyph"
                  style={{ color: `var(--sym-${fig.color + 1})`, '--i': index }}
                >
                  <Glyph shape={fig.shape} />
                </span>
              </button>
            )
          })}
        </div>

        {game.phase === 'countdown' && (
          <div className="ocount" aria-hidden="true">
            <span key={game.count} className="ocount__num">
              {game.count}
            </span>
          </div>
        )}

        {game.result && (
          <SuccessBurst
            variant="final"
            title={game.result.found > 0 ? '¡Tiempo!' : '¡Se acabó el tiempo!'}
            subtitle={`${game.result.found} ${game.result.found === 1 ? 'intruso' : 'intrusos'} · ${game.result.mistakes} ${game.result.mistakes === 1 ? 'error' : 'errores'}`}
            note={game.result.record ? 'Nueva mejor marca' : undefined}
          />
        )}
      </div>

      <p className="game__status" aria-live="polite">
        {game.message}
      </p>

      {game.result && (
        <div className="mresult">
          <Button onClick={onAgain}>Jugar de nuevo</Button>
          <Button variant="ghost" onClick={onLevels}>
            Cambiar nivel
          </Button>
        </div>
      )}
    </div>
  )
}
