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
          timeout: 0,
          proxyTimeout: 0,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // แยก vendor chunks ให้ละเอียดขึ้นเพื่อ better caching
            if (id.includes('node_modules')) {
              // React core - ไม่ค่อยเปลี่ยน
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor'
              }
              // Router - แยกออกมาเพราะใช้ในทุกหน้า
              if (id.includes('react-router-dom')) {
                return 'router'
              }
              // PDF libraries - ใหญ่มาก แยกออกมาเพื่อ lazy load
              if (id.includes('react-pdf') || id.includes('pdfjs-dist')) {
                return 'pdf-viewer'
              }
              // Rich text editor - ใหญ่มาก แยกออกมา
              if (id.includes('quill')) {
                return 'editor'
              }
              // Animation library - แยกออกมา
              if (id.includes('framer-motion')) {
                return 'animations'
              }
              // Icons - แยกออกมา
              if (id.includes('@fortawesome')) {
                return 'icons'
              }
              // UI libraries
              if (id.includes('sweetalert2') || id.includes('dompurify')) {
                return 'ui-libs'
              }
              // Utilities - เล็กๆ รวมกัน
              return 'vendor-utils'
            }
          },
        },
      },
      // Disable source maps in production เพื่อลดขนาดไฟล์
      sourcemap: false,
      // เพิ่ม chunk size warning limit
      chunkSizeWarningLimit: 800,
      // ใช้ esbuild สำหรับ minification (เร็วกว่า terser)
      minify: 'esbuild',
      target: 'es2015',
    },
  }
})