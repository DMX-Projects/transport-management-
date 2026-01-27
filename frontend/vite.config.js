import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
  const apiTarget = apiBaseUrl.replace(/\/api\/v1$/, '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        // Allow dev server to serve Django-uploaded media (e.g. POD proof images)
        '/media': {
          target: apiTarget,
          changeOrigin: true,
        }
      }
    }
  }
})
