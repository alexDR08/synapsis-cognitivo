import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { useActivitySummary } from '../hooks/useActivitySummary.js'
import { fullName } from '../lib/format.js'
import { winsFor } from '../lib/wins.js'
import { CheckCircleIcon, ChevronIcon, LogoutIcon, UserIcon } from './Icons.jsx'
import './ProfileMenu.css'

// Botón "Perfil" de la barra: despliega un mini menú con los aciertos y el cierre de sesión.
export default function ProfileMenu() {
  const [open, setOpen] = useState(false)
  const wrap = useRef(null)
  const trigger = useRef(null)
  const { pathname } = useLocation()

  // Cerrar al cambiar de pantalla
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Cerrar al tocar fuera o con Escape (y devolver el foco al botón)
  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => {
      if (!wrap.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="pmenu" ref={wrap}>
      <button
        ref={trigger}
        type="button"
        className="tabs__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-current={pathname === '/perfil' ? 'page' : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <UserIcon />
        Perfil
        <span className="pmenu__chevron">
          <ChevronIcon />
        </span>
      </button>
      {open && <MenuPanel onClose={() => setOpen(false)} />}
    </div>
  )
}

// Se monta al abrir el menú, así los aciertos se consultan al día cada vez.
function MenuPanel({ onClose }) {
  const { user, signOut } = useAuth()
  const { status, data } = useActivitySummary()
  const panel = useRef(null)
  const name = fullName(user)

  const wins = status === 'ok' ? winsFor('all', user.score, data.games) : user.score

  // Foco en la primera opción y navegación con flechas
  useEffect(() => {
    panel.current?.querySelector('[role="menuitem"]')?.focus()
  }, [])

  function onKeyDown(event) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const items = [...panel.current.querySelectorAll('[role="menuitem"]')]
    const index = items.indexOf(document.activeElement)
    const next = event.key === 'ArrowDown' ? index + 1 : index - 1
    items[(next + items.length) % items.length].focus()
  }

  return (
    <div className="pmenu__panel" role="menu" aria-label="Menú de perfil" ref={panel} onKeyDown={onKeyDown}>
      <div className="pmenu__who">
        {user.picture ? (
          <img className="pmenu__avatar" src={user.picture} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="pmenu__avatar pmenu__avatar--initial" aria-hidden="true">
            {name.charAt(0)}
          </span>
        )}
        <span className="pmenu__id">
          <strong>{name}</strong>
          <span className="muted">{user.email}</span>
        </span>
      </div>

      <Link to="/perfil" role="menuitem" className="pmenu__item" onClick={onClose}>
        <CheckCircleIcon />
        <span>Aciertos</span>
        <span className="pmenu__badge">{wins}</span>
      </Link>

      <button type="button" role="menuitem" className="pmenu__item pmenu__item--out" onClick={signOut}>
        <LogoutIcon />
        <span>Cerrar sesión</span>
      </button>
    </div>
  )
}
