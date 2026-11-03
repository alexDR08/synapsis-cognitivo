import { request } from './client.js'

// Registra un acierto en el servidor y devuelve el puntaje acumulado.
export function validateSequence(userSequence, targetSequence) {
  return request('/game/validate', {
    method: 'POST',
    auth: true,
    body: { userSequence, targetSequence },
  })
}
