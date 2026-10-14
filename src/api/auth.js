import { ApiError, request } from './client.js'

export async function loginWithPassword(email, password) {
  try {
    return await request('/auth/login', { method: 'POST', body: { email, password } })
  } catch (error) {
    // El backend devuelve el texto técnico de Mongoose; lo traducimos.
    if (error instanceof ApiError && /correo institucional/i.test(error.message)) {
      throw new ApiError('Usa tu correo institucional, por ejemplo usuario@uvp.edu.mx.', error.status)
    }
    throw error
  }
}

export function loginWithGoogle(credential) {
  return request('/auth/google', { method: 'POST', body: { credential } })
}

export function getProfile() {
  return request('/user/profile', { auth: true })
}
