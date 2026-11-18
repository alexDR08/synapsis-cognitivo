import { useSyncExternalStore } from 'react'
import { isMuted, setMuted, subscribeMuted } from '../lib/sfx.js'
import './SoundToggle.css'

export default function SoundToggle({ className = '' }) {
  const muted = useSyncExternalStore(subscribeMuted, isMuted, isMuted)
  return (
    <button
      type="button"
      className={`sound-toggle ${className}`.trim()}
      aria-pressed={!muted}
      aria-label={muted ? 'Activar sonidos' : 'Silenciar sonidos'}
      title={muted ? 'Activar sonidos' : 'Silenciar sonidos'}
      onClick={() => setMuted(!muted)}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" />
        {muted ? <path d="m16 9.5 5 5m0-5-5 5" /> : <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />}
      </svg>
    </button>
  )
}
