import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false, // Отключаем source maps в production
  },
  server: {
    host: '0.0.0.0', // Слушаем все интерфейсы
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/kaetram': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/kaetram/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Устанавливаем правильные заголовки для статических файлов
            if (req.url.endsWith('.ts') || req.url.endsWith('.scss')) {
              proxyReq.setHeader('Accept', 'application/javascript, text/css, */*');
            }
          });
        }
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true
      }
    }
  }
})
