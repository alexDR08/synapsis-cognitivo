import { useEffect, useState } from 'react'
import { useChispaVoice } from '../hooks/useChispaVoice.js'
import { randomTip } from '../lib/tips.js'
import Chispa from './Chispa.jsx'
import SpeakButton from './SpeakButton.jsx'
import './DailyTip.css'

export default function DailyTip() {
  const [tip, setTip] = useState(() => randomTip())
  const voice = useChispaVoice()
  const talking = voice.speaking && voice.text === tip

  // Al salir de la vista, Chispa se calla
  useEffect(() => voice.stop, [voice.stop])

  function another() {
    voice.stop()
    setTip((t) => randomTip(t))
  }

  return (
    <section className="tip" aria-labelledby="tip-title">
      <Chispa pose="senalando" size={110} className="tip__mascot" talking={talking} text={tip} />
      <div className="tip__body">
        <p className="tip__tag">Chispa te aconseja</p>
        <h2 id="tip-title">Consejo del día</h2>
        <p className="tip__text" aria-live="polite">
          {tip}
          <SpeakButton text={tip} />
        </p>
        <button type="button" className="tip__more" onClick={another}>
          Otro consejo
        </button>
      </div>
    </section>
  )
}
