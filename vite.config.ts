/// <reference types="vitest/config" />
import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv: el .env no llega solo a la configuracion de Vite.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      port: 5173,
      // Mismo origen en local y en produccion: sin CORS y con la misma baseURL relativa.
      proxy: {
        '/api': {
          target: env.VITE_DEV_API_TARGET || 'http://localhost:8080',
          changeOrigin: true,
          // Para el navegador es mismo origen; sin esto el backend aplicaria CORS
          // segun el host desde el que se abra la web (otra IP, *.localhost).
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'))
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      // Con la suite en paralelo, los tests de muchas interacciones pasan de los 5 s por defecto.
      testTimeout: 15_000,
    },
  }
})
