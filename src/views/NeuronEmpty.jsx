import { useCallback, useEffect, useMemo, useState } from 'react'
import Button from '../components/Button.jsx'
import Chispa from '../components/Chispa.jsx'
import NeuronGraph from '../components/NeuronGraph.jsx'
import SpeakButton from '../components/SpeakButton.jsx'
import { useChispaVoice } from '../hooks/useChispaVoice.js'
import { buildEmptyNetwork, emptyMessage, WAKE_GAMES } from '../lib/neuron.js'
import './NeuronView.css'

// "Mi neurona" cuando aún no hay partidas: la red duerme y Chispa invita a jugar.
export default function NeuronEmpty({ firstName, firstVisit }) {
  const nodes = useMemo(() => buildEmptyNetwork(), [])
  const [selectedId, setSelectedId] = useState(null)
  const [burst, setBurst] = useState(null)
  const voice = useChispaVoice()

  const selected = nodes.find((n) => n.id === selectedId) ?? null
  const msg = emptyMessage(firstVisit, selected, firstName)
  const talking = voice.speaking && voice.text === msg.text

  useEffect(() => voice.stop, [voice.stop])
  useEffect(() => {
    if (voice.speaking && voice.text !== msg.text) voice.stop()
  }, [msg.text, voice])

  // Una chispa recorre la red cada pocos segundos, como invitación a despertarla
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const ids = nodes.map((n) => n.id)
    let n = 0
    const fire = () => {
      n += 1
      setBurst({ id: ids[Math.floor(Math.random() * ids.length)], n })
    }
    const first = setTimeout(fire, 800)
    const id = setInterval(fire, 3500)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [nodes])

  const select = useCallback((id) => setSelectedId(id), [])

  return (
    <section className="neuron">
      <header className="neuron__head">
        <div>
          <h1>Mi neurona</h1>
          <p className="muted">Aquí verás crecer tu red mental a medida que juegues.</p>
        </div>
        <Chispa pose="pensando" size={84} />
      </header>

      <div className="neuron__layout">
        <div className="neuron__stage neuron__stage--empty">
          <div className="neuron__canvas">
            <NeuronGraph nodes={nodes} mode="vacio" selectedId={selectedId} onSelect={select} burst={burst} />
          </div>

          <div className="neuron__invite" role="status" aria-live="polite">
            <Chispa pose={msg.pose} size={72} talking={talking} text={msg.text} />
            <div>
              <p className="neuron__tag">Chispa dice</p>
              <p>
                {msg.text}
                <SpeakButton text={msg.text} />
              </p>
              <Button to={msg.to} variant="spark" size="sm" className="neuron__cta">
                {selected ? 'Despertarla' : 'Despertar mi neurona'}
              </Button>
            </div>
          </div>
        </div>

        <aside className="neuron__side">
          <section className="neuron__gym" aria-labelledby="wake-title">
            <h2 id="wake-title">Despierta tu red</h2>
            <p className="muted">Cada juego enciende una parte distinta. Con una ronda de unos minutos ya empieza a crecer.</p>
            <ol className="neuron__routine">
              {WAKE_GAMES.map((game) => (
                <li key={game.to}>
                  <div>
                    <strong>{game.label}</strong>
                    <span className="muted">Enciende: {game.wakes}</span>
                  </div>
                  <Button to={game.to} variant="spark" size="sm">
                    Jugar
                  </Button>
                </li>
              ))}
            </ol>
          </section>
          <p className="muted neuron__detail">Toca cualquier neurona dormida para ver cómo despertarla.</p>
        </aside>
      </div>
    </section>
  )
}
