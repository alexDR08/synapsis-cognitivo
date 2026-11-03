import { Link } from 'react-router-dom'
import './Button.css'

// <Button> para acciones, <Button to="/ruta"> para navegar.
export default function Button({
  variant = 'primary',
  size,
  block = false,
  to,
  className = '',
  type = 'button',
  ...props
}) {
  const classes = ['btn', `btn--${variant}`, size && `btn--${size}`, block && 'btn--block', className]
    .filter(Boolean)
    .join(' ')

  if (to) return <Link to={to} className={classes} {...props} />
  return <button type={type} className={classes} {...props} />
}
