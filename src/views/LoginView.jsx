import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import GoogleButton from '../components/GoogleButton.jsx'
import Logo from '../components/Logo.jsx'
import BrainAnimation from '../components/BrainAnimation.jsx'
import { useAuth } from '../context/useAuth.js'
import { INSTITUTIONAL_EMAIL } from '../lib/format.js'
import './LoginView.css'

export default function LoginView() {
  const { user, signInWithPassword, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const destination = location.state?.from?.pathname || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={destination} replace />

  async function attempt(action) {
    setError('')
    setBusy(true)
    try {
      await action()
      navigate(destination, { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    const mail = email.trim()
    if (!INSTITUTIONAL_EMAIL.test(mail)) {
      setError('Usa tu correo institucional, por ejemplo usuario@uvp.edu.mx.')
      return
    }
    if (password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres.')
      return
    }
    attempt(() => signInWithPassword(mail, password))
  }

  return (
    <div className="login">
      <aside className="login__aside">
        <Logo size={72} />
        <div>
          <h1>Entrena tu mente, un poco cada día.</h1>
          <p>Retos cortos de memoria para tus pausas entre clases.</p>
        </div>
        <BrainAnimation className="login__preview" />
      </aside>

      <main className="login__main">
        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <h2>Entrar</h2>
          <p className="muted login__lead">Con tu correo institucional.</p>

          <div className="field">
            <label htmlFor="email">Correo institucional</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="usuario@uvp.edu.mx"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <p className="login__error" role="alert">
            {error}
          </p>

          <Button type="submit" block disabled={busy}>
            {busy ? 'Entrando…' : 'Ingresar'}
          </Button>

          <div className="login__or">o</div>
          <GoogleButton onCredential={(credential) => attempt(() => signInWithGoogle(credential))} />
        </form>
      </main>
    </div>
  )
}
