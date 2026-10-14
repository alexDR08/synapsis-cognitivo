import { NavLink } from 'react-router-dom'
import { TargetIcon, UserIcon } from './Icons.jsx'
import './TabBar.css'

// Barra inferior en celular; en pantallas anchas se acomoda dentro del encabezado.
export default function TabBar() {
  return (
    <nav className="tabs" aria-label="Principal">
      <div className="tabs__list">
        <NavLink to="/" end>
          <TargetIcon />
          Entrenar
        </NavLink>
        <NavLink to="/perfil">
          <UserIcon />
          Perfil
        </NavLink>
      </div>
    </nav>
  )
}
