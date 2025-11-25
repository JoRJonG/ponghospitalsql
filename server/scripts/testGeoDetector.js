import { getCountryFromIP, isIPAllowed, getGeoInfo } from '../utils/geoDetector.js'

// Test IPs
const testIPs = [
  { ip: '127.0.0.1', desc: 'Localhost' },
  { ip: '::1', desc: 'IPv6 Localhost' },
  { ip: '1.10.132.45', desc: 'Thailand IP (True Internet)' },
  { ip: '8.8.8.8', desc: 'US IP (Google DNS)' },
  { ip: '2a06:98c0:3600::103', desc: 'Netherlands IPv6' },
  { ip: '204.101.161.15', desc: 'US IP' },
  { ip: '111.172.6.233', desc: 'China IP' },
]

console.log('🔍 Testing Geo-blocking with geoip-lite\n')

testIPs.forEach(({ ip, desc }) => {
  console.log(`\n📍 ${desc} (${ip})`)
  const country = getCountryFromIP(ip)
  const allowed = isIPAllowed(ip)
  const geoInfo = getGeoInfo(ip)
  
  console.log(`   Country: ${country || 'Unknown'}`)
  console.log(`   Allowed: ${allowed ? '✅ YES' : '❌ NO'}`)
  if (geoInfo) {
    console.log(`   Details:`, geoInfo)
  }
})

console.log('\n✅ Test completed')
