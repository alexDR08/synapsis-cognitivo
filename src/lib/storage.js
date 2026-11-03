// Claves de localStorage (las mismas que usaba el index.html anterior).
export const TOKEN_KEY = 'syn_token'
export const USER_KEY = 'syn_user'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
