import { useEffect, useRef, useState } from 'react'
import './GoogleButton.css'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const CONFIGURED = Boolean(CLIENT_ID) && !CLIENT_ID.startsWith('PEGA_AQUI')

let scriptPromise = null
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve()
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = resolve
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('No se pudo cargar Google'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

// Botón oficial de Google Identity Services. onCredential recibe el token (JWT) de Google.
export default function GoogleButton({ onCredential }) {
  const holder = useRef(null)
  const callback = useRef(onCredential)
  const [status, setStatus] = useState(CONFIGURED ? 'loading' : 'missing')

  useEffect(() => {
    callback.current = onCredential
  })

  useEffect(() => {
    if (!CONFIGURED) return undefined
    let cancelled = false

    loadGoogleScript()
      .then(() => {
        if (cancelled || !holder.current) return
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => callback.current(response.credential),
        })
        const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
        window.google.accounts.id.renderButton(holder.current, {
          theme: dark ? 'filled_black' : 'outline',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          locale: 'es',
          width: Math.min(380, holder.current.offsetWidth || 380),
        })
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="gbtn">
      <div ref={holder} className="gbtn__holder" />
      {status === 'missing' && (
        <p className="gbtn__note">Falta VITE_GOOGLE_CLIENT_ID en el archivo .env.</p>
      )}
      {status === 'error' && (
        <p className="gbtn__note">No se pudo cargar Google. Revisa tu conexión y recarga.</p>
      )}
    </div>
  )
}
