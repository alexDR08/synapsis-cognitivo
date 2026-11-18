import { useChispaVoice } from '../hooks/useChispaVoice.js'
import './SpeakButton.css'

// Mini botón para que Chispa lea `text` en voz alta (solo si el usuario lo pide).
export default function SpeakButton({ text }) {
  const voice = useChispaVoice()
  if (!voice.supported) return null
  const talking = voice.speaking && voice.text === text

  return (
    <button
      type="button"
      className={`speak${talking ? ' is-on' : ''}`}
      onClick={() => (talking ? voice.stop() : voice.speak(text))}
      aria-pressed={talking}
      aria-label={talking ? 'Detener la voz de Chispa' : 'Escuchar con la voz de Chispa'}
      title={talking ? 'Detener' : 'Escuchar a Chispa'}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {talking ? (
          <rect x="7" y="7" width="10" height="10" rx="1.5" />
        ) : (
          <>
            <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" />
            <path d="M16 9a4 4 0 0 1 0 6" />
          </>
        )}
      </svg>
    </button>
  )
}
