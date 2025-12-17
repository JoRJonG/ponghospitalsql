// Parse and normalize user agent strings for grouping

export function normalizeUserAgent(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') {
    return 'Unknown'
  }

  const ua = userAgent.trim()
  if (!ua) return 'Unknown'

  // Detect browser
  let browser = 'Unknown Browser'
  if (/Edg\//i.test(ua)) browser = 'Edge'
  else if (/Firefox\//i.test(ua)) browser = 'Firefox'
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = 'Opera'
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome'
  else if (/Safari\//i.test(ua) && /Version\//i.test(ua)) browser = 'Safari'
  else if (/Chromium/i.test(ua)) browser = 'Chromium'

  // Detect platform
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua)
  const isWindows = /Windows NT/i.test(ua)
  const isMac = /Mac OS X/i.test(ua)
  const isLinux = /Linux/i.test(ua) && !/Android/i.test(ua)

  let platform = null
  if (isMobile) {
    if (/iPad|iPhone|iPod/i.test(ua)) platform = 'iOS'
    else if (/Android/i.test(ua)) platform = 'Android'
    else platform = 'Mobile'
  } else if (isWindows) {
    platform = 'Windows'
  } else if (isMac) {
    platform = 'macOS'
  } else if (isLinux) {
    platform = 'Linux'
  }

  // Combine browser and platform
  const parts = [browser, platform].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'Unknown'
}
