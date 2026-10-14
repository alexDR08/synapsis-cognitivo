import { getToken } from '../lib/storage.js'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

// Las rutas empiezan con /api; Vite las reenvía al backend (ver vite.config.mjs).
export async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(
      'No se pudo conectar con el servidor. Revisa que esté corriendo (npm run server).',
      0,
    )
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(
      data?.message || data?.error || 'Algo salió mal. Inténtalo de nuevo.',
      response.status,
    )
  }
  return data
}

// Token vencido o inválido: el backend responde 400/401 con "Token ..."
export function isAuthError(error) {
  return error instanceof ApiError && (error.status === 400 || error.status === 401)
}
