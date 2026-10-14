import { useEffect } from 'react'
import { getProfile } from '../api/auth.js'
import { isAuthError } from '../api/client.js'
import Button from '../components/Button.jsx'
import { useAuth } from '../context/useAuth.js'
import { fullName } from '../lib/format.js'
import './ProfileView.css'

export default function ProfileView() {
  const { user, setScore, signOut } = useAuth()

  // Al abrir el perfil se refresca el puntaje con el valor del servidor.
  useEffect(() => {
    let cancelled = false
    getProfile()
      .then((profile) => {
        if (!cancelled) setScore(profile.score)
      })
      .catch((error) => {
        if (!cancelled && isAuthError(error)) signOut()
      })
    return () => {
      cancelled = true
    }
  }, [setScore, signOut])

  const name = fullName(user)

  return (
    <section className="profile">
      <h1>Tu perfil</h1>
      <div className="profile__card">
        {user.picture ? (
          <img className="profile__avatar" src={user.picture} alt="" referrerPolicy="no-referrer" />
        ) : (
          <div className="profile__avatar profile__avatar--initial" aria-hidden="true">
            {name.charAt(0)}
          </div>
        )}
        <p className="profile__name">{name}</p>
        <p className="muted">{user.email}</p>

        <p className="profile__score">{user.score}</p>
        <p className="muted profile__label">aciertos acumulados</p>

        <Button variant="ghost" onClick={signOut}>
          Cerrar sesión
        </Button>
      </div>
    </section>
  )
}
