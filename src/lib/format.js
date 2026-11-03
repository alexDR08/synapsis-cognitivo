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

// 3725 -> "1 h 02 min"; 540 -> "9 min"; 40 -> "40 s"
export function formatDuration(totalSeconds = 0) {
  const seconds = Math.round(totalSeconds)
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`
}

export const daysLabel = (n) => `${n} ${n === 1 ? 'día' : 'días'}`

export function shortDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Mismo criterio que valida el backend (correo institucional UVP)
export const INSTITUTIONAL_EMAIL = /^[^@\s]+@uvp\.(edu\.)?mx$/i
