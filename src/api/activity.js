// Actividad del usuario (sesiones, intentos, eventos y resumen). Se guarda en Firestore a través
// del backend. Registrar actividad NUNCA debe interrumpir la app: los errores se ignoran.
import { getToken } from '../lib/storage.js'
import { request } from './client.js'

const SESSION_KEY = 'syn_session'

function newId() {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
  }
}

function readStoredSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

function storeSession(id) {
  try {
    if (id) sessionStorage.setItem(SESSION_KEY, id)
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* sin sessionStorage la sesión dura mientras se quede cargada la página */
  }
}

// Una sesión = una visita en esta pestaña. Se conserva al recargar y se cierra al cerrar sesión.
let sessionId = readStoredSession()

const quiet = (promise) => promise.catch(() => null)

function deviceInfo() {
  try {
    return {
      language: navigator.language,
      screen: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      userAgent: navigator.userAgent.slice(0, 150),
    }
  } catch {
    return {}
  }
}

export function startActivitySession(provider = 'unknown') {
  if (!getToken()) return null
  if (!sessionId) {
    sessionId = newId()
    storeSession(sessionId)
  }
  return quiet(
    request('/activity/sessions', {
      method: 'POST',
      auth: true,
      body: { id: sessionId, provider, device: deviceInfo() },
    }),
  )
}

// Latido: actualiza "última actividad". Con final=true marca la sesión como cerrada.
function pingSession(final) {
  if (!sessionId || !getToken()) return null
  return quiet(
    request(`/activity/sessions/${sessionId}/ping`, {
      method: 'POST',
      auth: true,
      body: { final },
      keepalive: true,
    }),
  )
}

export const pingActivitySession = () => pingSession(false)

export function closeActivitySession() {
  const done = pingSession(true)
  sessionId = null
  storeSession(null)
  return done
}

/**
 * Registra un intento de juego.
 * { game: 'sequence'|'memory'|'odd', level, success, durationSec, metrics: { ... } }
 */
export function logAttempt({ game, level, success, durationSec = 0, metrics = {} }) {
  if (!getToken()) return null
  return quiet(
    request('/activity/attempts', {
      method: 'POST',
      auth: true,
      body: { id: newId(), sessionId, game, level, success, durationSec, metrics },
    }),
  )
}

/** Registra cualquier dato suelto: type en minúsculas_con_guiones_bajos y datos simples. */
export function logEvent(type, data = {}) {
  if (!getToken()) return null
  return quiet(request('/activity/events', { method: 'POST', auth: true, body: { type, sessionId, data } }))
}

export function getActivitySummary() {
  return request('/activity/summary', { auth: true })
}
