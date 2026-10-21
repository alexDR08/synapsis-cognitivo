import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    // Las llamadas a /api se reenvían al backend de Express (puerto 5000):
    // el navegador solo habla con el puerto 5173 y no hay problemas de CORS.
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
