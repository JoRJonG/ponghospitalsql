import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import viteCompression from 'vite-plugin-compression'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return {
    plugins: [
      react(), 
      tailwindcss(),
      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
      }),
      viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
      })
    ],
    base: env.VITE_BASE_URL || '/',
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
          // ตั้ง proxyTimeout เป็น 5 นาที เพื่อรองรับการอัปโหลดไฟล์ขนาดใหญ่
          // ค่า 0 ใน http-proxy จะใช้ค่า default แทน ดังนั้นต้องระบุเวลาที่ยาวพอ
          proxyTimeout: 300000,
          timeout: 300000, // เพิ่ม timeout
          configure: (proxy) => {
            // ป้องกัน Vite Proxy ตัด HTTP Connection ของ SSE และ file upload
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = proxy as any
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            p.on('proxyReq', (proxyReq: any, req: any) => {
              if (req.url?.includes('/stream') || req.headers.accept === 'text/event-stream') {
                proxyReq.setHeader('Connection', 'keep-alive')
              }
              // รองรับการส่ง multipart form data ที่ใหญ่
              if (req.headers['content-type']?.includes('multipart/form-data')) {
                proxyReq.setHeader('Connection', 'keep-alive')
              }
            })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            p.on('proxyRes', (proxyRes: any, req: any) => {
              if (req.url?.includes('/stream') || req.headers.accept === 'text/event-stream') {
                proxyRes.headers['x-accel-buffering'] = 'no'
                proxyRes.headers['cache-control'] = 'no-cache'
                proxyRes.headers['connection'] = 'keep-alive'
              }
            })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            p.on('error', (err: any, req: any, res: any) => {
              // @ts-expect-error console is available in Node.js
              console.error('[Vite Proxy Error]', err.message, req.url)
              if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'Proxy error', details: err.message }))
              }
            })
          }
        },
      },
      // ตั้งค่า middleware เพื่อส่ง Content-Type ที่ถูกต้องสำหรับ sitemap และ robots.txt
      middlewareMode: false,
      headers: {
        'Cache-Control': 'no-cache',
      },
    },
    // กำหนด MIME types สำหรับไฟล์พิเศษ
    assetsInclude: ['**/*.xml'],
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // แยก vendor chunks ให้ละเอียดขึ้นเพื่อ better caching
            if (id.includes('node_modules')) {
              // React core - ไม่ค่อยเปลี่ยน
              if (id.includes('/react/') || id.includes('/react-dom/')) {
                return 'react-vendor'
              }
              // Router - แยกออกมาเพราะใช้ในทุกหน้า
              if (id.includes('react-router-dom') || id.includes('react-router')) {
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
              // Chart library
              if (id.includes('recharts') || id.includes('d3-')) {
                return 'charts'
              }
              // Slider/Swiper
              if (id.includes('swiper')) {
                return 'swiper'
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
      // esnext: browser สมัยใหม่ได้ code เล็กกว่า (ไม่ต้อง transpile)
      target: 'esnext',
    },
  }
})