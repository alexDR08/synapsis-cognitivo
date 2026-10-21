import { useCallback, useEffect, useMemo, useState } from 'react'
import { closeActivitySession, pingActivitySession, startActivitySession } from '../api/activity.js'
import * as authApi from '../api/auth.js'
import { TOKEN_KEY, USER_KEY } from '../lib/storage.js'
import { AuthContext } from './AuthContext.js'

const EMPTY = { token: null, user: null }

function readSession() {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null')
    return token && user ? { token, user } : EMPTY
  } catch {
    return EMPTY
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession)

  useEffect(() => {
    try {
      if (session.token) {
        localStorage.setItem(TOKEN_KEY, session.token)
        localStorage.setItem(USER_KEY, JSON.stringify(session.user))
      } else {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      }
    } catch {
      /* sin localStorage la sesión dura mientras la pestaña esté abierta */
    }
  }, [session])

  // Cada visita (con sesión iniciada) queda registrada; al ocultar o cerrar la pestaña se avisa la última actividad.
  const token = session.token
  const provider = session.user?.provider
  useEffect(() => {
    if (!token) return undefined
    startActivitySession(provider)
    const onHidden = () => {
      if (document.visibilityState === 'hidden') pingActivitySession()
    }
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('pagehide', pingActivitySession)
    return () => {
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('pagehide', pingActivitySession)
    }
  }, [token, provider])

  const startSession = useCallback((data, provider) => {
    setSession({
      token: data.token,
      user: {
        provider,
        email: data.email,
        username: data.username,
        name: data.name ?? null,
        picture: data.picture ?? null,
        score: data.score ?? 0,
      },
    })
  }, [])

  const value = useMemo(
    () => ({
      user: session.user,
      async signInWithPassword(email, password) {
        startSession(await authApi.loginWithPassword(email, password), 'password')
      },
      async signInWithGoogle(credential) {
        startSession(await authApi.loginWithGoogle(credential), 'google')
      },
      signOut() {
        closeActivitySession() // marca el cierre antes de borrar el token
        setSession(EMPTY)
        window.google?.accounts?.id?.disableAutoSelect?.()
      },
      setScore(score) {
        setSession((s) => (s.user ? { ...s, user: { ...s.user, score } } : s))
      },
      addScore(points = 1) {
        setSession((s) =>
          s.user ? { ...s, user: { ...s.user, score: s.user.score + points } } : s,
        )
      },
    }),
    [session.user, startSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
