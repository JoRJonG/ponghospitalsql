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
