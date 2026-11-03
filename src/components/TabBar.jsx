import { NavLink } from 'react-router-dom'
import { TargetIcon } from './Icons.jsx'
import ProfileMenu from './ProfileMenu.jsx'
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
        <ProfileMenu />
      </div>
    </nav>
  )
}
