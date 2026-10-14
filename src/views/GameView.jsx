import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { validateSequence } from '../api/game.js'
import { isAuthError } from '../api/client.js'
import Button from '../components/Button.jsx'
import NeuronBoard from '../components/NeuronBoard.jsx'
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

  const game = useSequenceGame({ onCorrect: handleCorrect })
  const { start, stop } = game

  useEffect(() => {
    start()
    return stop
  }, [start, stop])

  function leave() {
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
          Nivel medio · Aciertos: <strong>{game.hits}</strong>
        </p>
      </div>

      <NeuronBoard
        lit={game.lit}
        tapped={game.tapped}
        bad={game.bad}
        trail={game.trail}
        trailTone={game.trailTone}
        locked={game.phase !== 'input'}
        onTap={game.tap}
      />

      <p className="game__status" aria-live="polite">
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
