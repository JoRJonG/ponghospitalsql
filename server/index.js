import { createServer } from './app_mysql.js'
import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'

const PORT = process.env.PORT || 5000
const HTTPS_PORT = process.env.HTTPS_PORT || 5443
const USE_HTTPS = process.env.USE_HTTPS === 'true' && process.env.NODE_ENV !== 'plesk'

async function start() {
  const { app, connectDb } = await createServer()
  await connectDb()

  // In Plesk environment, always use HTTP as Plesk handles SSL
  if (process.env.NODE_ENV === 'plesk' || !USE_HTTPS) {
    app.listen(PORT, '0.0.0.0', () => console.log(`🌐 HTTP server listening on port ${PORT}`))
  } else if (USE_HTTPS) {
    // Check for SSL certificates
    const sslKeyPath = process.env.SSL_KEY_PATH || path.join(process.cwd(), 'ssl', 'key.pem')
    const sslCertPath = process.env.SSL_CERT_PATH || path.join(process.cwd(), 'ssl', 'cert.pem')

    if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
      const sslOptions = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath)
      }

      const httpsServer = https.createServer(sslOptions, app)
      httpsServer.listen(PORT, '0.0.0.0', () => {
        console.log(`🔒 HTTPS server listening on https://localhost:${PORT}`)
      })
    } else {
      console.warn('⚠️  SSL certificates not found, falling back to HTTP')
      app.listen(PORT, '0.0.0.0', () => console.log(`🌐 HTTP server listening on http://localhost:${PORT}`))
    }
  } else {
    app.listen(PORT, '0.0.0.0', () => console.log(`🌐 HTTP server listening on http://localhost:${PORT}`))
  }
}

// Local start
if (process.env.VERCEL !== '1') {
  start()
}

// For Vercel serverless
export default async function handler(req, res) {
  const { app, connectDb } = await createServer()
  if (!app.locals.dbConnected) {
    await connectDb()
  }
  app(req, res)
}
