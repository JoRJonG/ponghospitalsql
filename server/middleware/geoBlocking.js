import { isIPAllowed, getGeoInfo } from '../utils/geoDetector.js'
import { exec } from '../database.js'

/**
 * Geo-blocking middleware - blocks non-Thailand IPs
 */
export function geoBlockingMiddleware(req, res, next) {
  try {
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress
    
    // Check if IP is allowed
    const allowed = isIPAllowed(ip)
    
    if (!allowed) {
      const geoInfo = getGeoInfo(ip)
      const country = geoInfo?.country || 'Unknown'
      const userAgent = req.headers['user-agent'] || 'Unknown'
      const path = req.originalUrl || req.url
      
      console.warn(`[geoBlocking] Access denied from ${country} (IP: ${ip}) - ${path}`)
      
      // Log to database asynchronously (don't block response)
      logBlockedAccess(ip, country, userAgent, path).catch(err => {
        console.error('[geoBlocking] Failed to log blocked access:', err.message)
      })
      
      return res.status(403).json({
        error: 'Access denied',
        message: 'This service is only available in Thailand',
        country: country,
      })
    }

    next()
  } catch (error) {
    console.error('[geoBlocking] Error in geo-blocking middleware:', error.message)
    // On error, allow access (fail-open approach)
    next()
  }
}

/**
 * Log blocked access attempt to database
 */
async function logBlockedAccess(ip, country, userAgent, path) {
  try {
    await exec(
      'INSERT INTO geo_blocking_logs (ip_address, country_code, user_agent, path) VALUES (?, ?, ?, ?)',
      [ip, country, userAgent, path]
    )
  } catch (error) {
    // Ignore database errors to prevent middleware failure
    throw error
  }
}

export default geoBlockingMiddleware
