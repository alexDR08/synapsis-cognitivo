function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// "alexis.perez" -> "Alexis Perez"
export function nameFromUsername(username = '') {
  return username
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(' ')
    .map(capitalize)
    .join(' ')
}

export function fullName(user) {
  return user?.name || nameFromUsername(user?.username)
}

export function firstName(user) {
  return fullName(user).split(' ')[0] || 'tú'
}

export function todayLabel() {
  return capitalize(
    new Date().toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
  )
}

// Mismo criterio que valida el backend (correo institucional UVP)
export const INSTITUTIONAL_EMAIL = /^[^@\s]+@uvp\.(edu\.)?mx$/i
