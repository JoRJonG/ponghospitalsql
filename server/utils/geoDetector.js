import geoip from 'geoip-lite'

const ALLOWED_COUNTRIES = ['TH'] // Thailand only
const BYPASS_IPS = process.env.GEO_BYPASS_IPS?.split(',').map(ip => ip.trim()) || [
  '127.0.0.1',
  '::1',
  'localhost',
]

/**
 * Get country code from IP address
 * @param {string} ip - IP address
 * @returns {string|null} Country code (e.g., 'TH', 'US') or null
 */
export function getCountryFromIP(ip) {
  if (!ip || BYPASS_IPS.includes(ip)) {
    return 'LOCAL'
  }

  // Clean IPv6 mapped IPv4 addresses
  const cleanIp = ip.replace(/^::ffff:/i, '')

  try {
    const geo = geoip.lookup(cleanIp)
    return geo?.country || null
  } catch (error) {
    console.warn('[geoDetector] Error looking up IP:', cleanIp, error.message)
    return null
  }
}

/**
 * Check if IP is allowed (Thailand only)
 * @param {string} ip - IP address
 * @returns {boolean} True if allowed, false if blocked
 */
export function isIPAllowed(ip) {
  if (!ip) return false
  
  if (BYPASS_IPS.includes(ip)) {
    return true
  }

  const countryCode = getCountryFromIP(ip)
  
  if (countryCode === 'LOCAL') {
    return true
  }

  if (!countryCode) {
    // If can't determine, allow by default (fail-open)
    return true
  }

  const allowed = ALLOWED_COUNTRIES.includes(countryCode)
  
  if (!allowed) {
    console.log(`[geoDetector] Blocked access from ${countryCode} (IP: ${ip})`)
  }

  return allowed
}

/**
 * Get detailed geo information for IP
 * @param {string} ip - IP address
 * @returns {object|null} Geo information or null
 */
export function getGeoInfo(ip) {
  if (!ip) return null

  const cleanIp = ip.replace(/^::ffff:/i, '')

  try {
    const geo = geoip.lookup(cleanIp)
    return geo ? {
      country: geo.country,
      region: geo.region,
      city: geo.city,
      timezone: geo.timezone,
      ll: geo.ll, // lat/long
    } : null
  } catch {
    return null
  }
}
