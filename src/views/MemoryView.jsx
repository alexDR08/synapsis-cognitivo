import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import MemoryCard from '../components/MemoryCard.jsx'
import SuccessBurst from '../components/SuccessBurst.jsx'
import { logEvent } from '../api/activity.js'
import { useAuth } from '../context/useAuth.js'
import { useMemoryGame } from '../hooks/useMemoryGame.js'
import { LEVELS, formatTime, getBest } from '../lib/memory.js'
import './MemoryView.css'

export default function MemoryView() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [level, setLevel] = useState(null)
  const [round, setRound] = useState(0) // al cambiar, el tablero se vuelve a montar con cartas nuevas

  if (level) {
    return (
      <MemoryRound
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

      <h1 className="memory__title">Memorama</h1>
      <p className="muted memory__lead">
        Primero verás dónde está cada carta y tendrás unos segundos para memorizarlas. Luego se
        tapan y debes encontrar las parejas con los menos movimientos. Elige un nivel.
      </p>

      <ul className="levels">
        {LEVELS.map((item) => {
          const best = getBest(user.email, item.pairs)
          return (
            <li key={item.pairs}>
              <button type="button" className="levels__item" onClick={() => {
                  logEvent('level_selected', { game: 'memory', level: item.id })
                  setLevel(item)
                }}>
                <span>
                  <strong>{item.label}</strong>
                  <span className="muted levels__detail">
                    {item.detail} · memorizas {item.memorizeSeconds} s
                  </span>
                </span>
                <span className="muted levels__best">
                  {best ? `Mejor: ${best.moves} mov. en ${formatTime(best.seconds)}` : 'Sin marca todavía'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function MemoryRound({ level, email, onAgain, onLevels }) {
  const navigate = useNavigate()
  const game = useMemoryGame(level, email)

  return (
    <div className="game">
      <div className="game__bar">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          Salir
        </Button>
        <p className="muted">
          {level.label} · Movimientos: <strong>{game.moves}</strong> · Tiempo:{' '}
          <strong>{formatTime(game.seconds)}</strong>
        </p>
      </div>

      <MemorizePanel game={game} pairs={level.pairs} />

      <div className="mwrap">
        <div className="mboard">
          {game.deck.map((card, index) => {
            const done = game.matched.includes(card.symbol)
            const faceUp =
              game.phase === 'preview' ||
              (game.phase === 'playing' && (game.flipped.includes(index) || done))
            return (
              <MemoryCard
                key={card.id}
                position={index + 1}
                order={index}
                symbol={card.symbol}
                stage={game.phase}
                faceUp={faceUp}
                matched={done}
                missed={game.missed.includes(index)}
                onFlip={() => game.flip(index)}
              />
            )
          })}
        </div>
        {game.result && (
          <SuccessBurst
            variant="final"
            title="¡Memorama completo!"
            subtitle={`${game.result.moves} movimientos en ${formatTime(game.result.seconds)}`}
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

// Franja sobre el tablero: cuenta atrás mientras se memoriza y, al jugar, parejas encontradas.
function MemorizePanel({ game, pairs }) {
  const memorizing = game.phase !== 'playing'
  const countingDown = game.phase === 'preview'

  if (memorizing) {
    return (
      <div className={`mprev mprev--${game.phase}`}>
        <div className="mprev__row">
          <span className="mprev__label">
            {game.phase === 'dealing' && 'Prepárate…'}
            {game.phase === 'preview' && 'Memoriza las posiciones'}
            {game.phase === 'hiding' && '¡A jugar!'}
          </span>
          <span className="mprev__count" aria-hidden="true">
            {countingDown && (
              <span key={game.countdown} className="mprev__num">
                {game.countdown}
              </span>
            )}
          </span>
        </div>
        <div className="mprev__track" aria-hidden="true">
          <span
            className="mprev__fill"
            style={countingDown ? { animationDuration: `${game.memorizeSeconds}s` } : undefined}
          />
        </div>
        <button
          type="button"
          className="mprev__skip"
          onClick={game.skipPreview}
          disabled={!countingDown}
          aria-hidden={!countingDown}
          tabIndex={countingDown ? 0 : -1}
        >
          Ya las memoricé
        </button>
      </div>
    )
  }

  return (
    <div className="mprev mprev--playing">
      <div className="mprev__row">
        <span className="mprev__label">Parejas encontradas</span>
        <span className="mprev__count">
          {game.matched.length} / {pairs}
        </span>
      </div>
      <div className="mprev__pips" aria-hidden="true">
        {Array.from({ length: pairs }, (_, i) => (
          <span key={i} className={`mprev__pip${i < game.matched.length ? ' is-on' : ''}`} />
        ))}
      </div>
    </div>
  )
}
