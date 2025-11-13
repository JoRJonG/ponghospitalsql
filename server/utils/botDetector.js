// Simple bot user-agent detection used to filter out obvious automated traffic

const BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /preview/i,
  /python-requests/i,
  /wget/i,
  /curl/i,
  /httpclient/i,
  /libwww-perl/i,
  /java\//i,
  /postmanruntime/i,
  /monitor/i,
  /uptime/i,
  /masscan/i,
  /scanner/i,
  /sqlmap/i,
  /okhttp/i,
  /go-http-client/i,
  /axios/i,
  /headlesschrome/i,
  /phantomjs/i,
  /hello\s*world/i,
  /friendly/i,
  /facebookexternalhit/i,
  /slurp/i,
  /bingpreview/i,
  /yandex/i,
]

export function isBotUserAgent(userAgent) {
  if (!userAgent) return false
  return BOT_PATTERNS.some(pattern => pattern.test(userAgent))
}

// Generate SQL WHERE condition to filter out bots
export function getBotFilterSQL(userAgentColumn = 'user_agent') {
  // Create SQL pattern matching for all bot patterns
  const conditions = BOT_PATTERNS.map(() => 
    `${userAgentColumn} NOT REGEXP ?`
  ).join(' AND ')
  
  return conditions
}

// Get bot patterns for SQL REGEXP
export function getBotPatternsForSQL() {
  return BOT_PATTERNS.map(pattern => {
    // Convert JavaScript regex to MySQL REGEXP pattern
    const source = pattern.source
    return source
  })
}
