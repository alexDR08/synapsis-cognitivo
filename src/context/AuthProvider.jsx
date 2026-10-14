import { useCallback, useEffect, useMemo, useState } from 'react'
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

  const startSession = useCallback((data) => {
    setSession({
      token: data.token,
      user: {
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
        startSession(await authApi.loginWithPassword(email, password))
      },
      async signInWithGoogle(credential) {
        startSession(await authApi.loginWithGoogle(credential))
      },
      signOut() {
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
