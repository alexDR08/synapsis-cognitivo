import { useSyncExternalStore } from 'react'
import { getState, speak, stop, subscribe, voiceSupported } from '../lib/chispaVoice.js'

export function useChispaVoice() {
  const state = useSyncExternalStore(subscribe, getState, getState)
  return { ...state, speak, stop, supported: voiceSupported }
}
