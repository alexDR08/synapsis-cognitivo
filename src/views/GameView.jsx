import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logAttempt, logEvent } from '../api/activity.js'
import { validateSequence } from '../api/game.js'
import { isAuthError } from '../api/client.js'
import Button from '../components/Button.jsx'
import NeuronBoard from '../components/NeuronBoard.jsx'
import SuccessBurst from '../components/SuccessBurst.jsx'
import { useAuth } from '../context/useAuth.js'
import { useSequenceGame } from '../hooks/useSequenceGame.js'
import './GameView.css'

export default function GameView() {
  const navigate = useNavigate()
  const { addScore, setScore, signOut } = useAuth()
  const [saveError, setSaveError] = useState('')

  // Suma el acierto al instante y luego deja el valor que confirme el servidor.
  const handleCorrect = useCallback(
    async (userSequence, targetSequence) => {
      addScore(1)
      try {
        const result = await validateSequence(userSequence, targetSequence)
        setScore(result.score)
        setSaveError('')
      } catch (error) {
        if (isAuthError(error)) {
          signOut()
          return
        }
        setSaveError('No se pudo guardar el acierto en el servidor.')
      }
    },
    [addScore, setScore, signOut],
  )

  // Cada ronda (acierto o error) queda registrada como un intento.
  const handleAttempt = useCallback((attempt) => {
    logAttempt({
      game: 'sequence',
      level: 'medio',
      success: attempt.success,
      durationSec: attempt.durationSec,
      metrics: { length: attempt.length, hits: attempt.hits, taps: attempt.taps },
    })
  }, [])

  const game = useSequenceGame({ onCorrect: handleCorrect, onAttempt: handleAttempt })
  const { start, stop } = game

  useEffect(() => {
    start()
    return stop
  }, [start, stop])

  function leave() {
    if (game.hits > 0) logEvent('game_exit', { game: 'sequence', hits: game.hits })
    stop()
    navigate('/')
  }

  return (
    <div className="game">
      <div className="game__bar">
        <Button variant="ghost" size="sm" onClick={leave}>
          Salir
        </Button>
        <p className="muted">
          Nivel medio · Aciertos:{' '}
          <strong key={game.hits} className="game__hits">
            {game.hits}
          </strong>
        </p>
      </div>

      <div className="game__board">
        <NeuronBoard
          lit={game.lit}
          tapped={game.tapped}
          bad={game.bad}
          trail={game.trail}
          trailTone={game.trailTone}
          locked={game.phase !== 'input'}
          celebrate={game.phase === 'won'}
          onTap={game.tap}
        />
        {game.phase === 'won' && (
          <SuccessBurst
            key={game.hits}
            title="¡Patrón correcto!"
            subtitle={game.hits === 1 ? 'Llevas 1 acierto' : `Llevas ${game.hits} aciertos`}
          />
        )}
      </div>

      <p className={`game__status${game.phase === 'won' ? ' is-won' : ''}`} aria-live="polite">
        {game.message}
      </p>

      <div className="game__memory">
        <span className="muted">Tiempo de memorización</span>
        <div className="game__track">
          <div
            key={game.memorize.run}
            className="game__fill"
            style={{ animationDuration: `${game.memorize.ms}ms` }}
          />
        </div>
        <span className="muted game__length">Patrón de {game.length} puntos</span>
      </div>

      {saveError && (
        <p className="game__error" role="alert">
          {saveError}
        </p>
      )}
    </div>
  )
}
