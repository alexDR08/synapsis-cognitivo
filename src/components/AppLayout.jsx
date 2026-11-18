import { Link, Outlet } from 'react-router-dom'
import Logo from './Logo.jsx'
import TabBar from './TabBar.jsx'
import './AppLayout.css'
import SoundToggle from './SoundToggle.jsx'

export default function AppLayout() {
  return (
    <div className="shell">
      <header className="shell__bar">
        <Link to="/" aria-label="Ir al inicio">
          <Logo size={52} />
        </Link>
        <SoundToggle className="shell__sound" />
        <TabBar />
      </header>
      <main className="shell__main">
        <Outlet />
      </main>
    </div>
  )
}
