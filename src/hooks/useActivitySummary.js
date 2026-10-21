import { useEffect, useState } from 'react'
import { getActivitySummary } from '../api/activity.js'

/**
 * Carga el resumen de actividad (racha, contadores, últimos intentos).
 * status: 'loading' | 'ok' | 'off' (el servidor no tiene Firestore configurado o no respondió).
 */
export function useActivitySummary() {
  const [state, setState] = useState({ status: 'loading', data: null })

  useEffect(() => {
    let cancelled = false
    getActivitySummary()
      .then((data) => {
        if (!cancelled) setState({ status: 'ok', data })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'off', data: null })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
