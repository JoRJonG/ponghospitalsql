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
  /semrush/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /rogerbot/i,
  /linkedin/i,
  /embedly/i,
  /quora/i,
  /outbrain/i,
  /pinterest/i,
  /developers\.google\.com/i,
  /cloudflare/i,
  /uptimerobot/i,
  /statuspage/i,
  /monitoring/i,
  /check_http/i,
  /nagios/i,
  /newrelic/i,
  /pingdom/i,
  /bot\.htm/i,
  /robots/i,
  /netcraft/i,
  /baiduspider/i,
  /sogou/i,
  /exabot/i,
  /ia_archiver/i,
  /speedy/i,
  /voila/i,
  /jeeves/i,
  /scrape/i,
  /dataprovider/i,
  /python/i,
  /perl/i,
  /ruby/i,
  /node-fetch/i,
  /got\//i,
  /request/i,
]

export function isBotUserAgent(userAgent) {
  if (!userAgent) return false
  return BOT_PATTERNS.some(pattern => pattern.test(userAgent))
}

// Get MySQL REGEXP pattern for filtering bots
export function getBotRegexPattern() {
  // Convert JavaScript patterns to MySQL REGEXP
  // Combine all patterns with | (OR)
  return 'bot|crawler|spider|preview|python-requests|wget|curl|httpclient|libwww-perl|java/|postmanruntime|monitor|uptime|masscan|scanner|sqlmap|okhttp|go-http-client|axios|headlesschrome|phantomjs|hello[[:space:]]*world|friendly|facebookexternalhit|slurp|bingpreview|yandex|semrush|ahrefsbot|mj12bot|dotbot|rogerbot|linkedin|embedly|quora|outbrain|pinterest|developers\\.google\\.com|cloudflare|uptimerobot|statuspage|monitoring|check_http|nagios|newrelic|pingdom|bot\\.htm|robots|netcraft|baiduspider|sogou|exabot|ia_archiver|speedy|voila|jeeves|scrape|dataprovider|python|perl|ruby|node-fetch|got/|request'
}

// Generate SQL WHERE condition to filter out bots
export function getBotFilterWhereClause(userAgentColumn = 'user_agent') {
  return `(${userAgentColumn} IS NULL OR ${userAgentColumn} NOT REGEXP '${getBotRegexPattern()}')`
}
