import DOMPurify from 'dompurify'

// Sanitize HTML for safe rendering with dangerouslySetInnerHTML
export function sanitize(html?: string | null): { __html: string } {
  const clean = DOMPurify.sanitize(String(html || ''), {
    USE_PROFILES: { html: true },
    ALLOWED_ATTR: ['href','src','alt','title','target','rel','class','style'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-]|$))/i,
  })
  return { __html: clean }
}

/**
 * Sanitize HTML input to prevent XSS
 * @param {string} input - The input string to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return input
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false
  })
}

/**
 * Sanitize plain text input (remove HTML tags)
 * @param {string} input - The input string to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return input
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] })
}
