import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return {
    plugins: [tailwindcss()],
    base: env.VITE_BASE_URL || '/',
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Separate vendor chunks for better caching
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor'
              }
              if (id.includes('react-router-dom')) {
                return 'router'
              }
              if (id.includes('react-pdf') || id.includes('pdfjs-dist')) {
                return 'pdf'
              }
              if (id.includes('framer-motion') || id.includes('@fortawesome')) {
                return 'ui'
              }
              return 'vendor'
            }
          },
        },
      },
      // Enable source maps for production debugging
      sourcemap: true,
      // Optimize chunk size
      chunkSizeWarningLimit: 1000,
    },
  }
})