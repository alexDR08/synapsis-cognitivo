import logo from '../assets/logo.png'
import './Logo.css'

// El logotipo tiene fondo blanco, por eso va sobre una ficha blanca también en modo oscuro.
export default function Logo({ size = 56 }) {
  return (
    <span className="logo" style={{ '--size': `${size}px` }}>
      <img src={logo} alt="Synapsis Cognitivo" />
    </span>
  )
}
