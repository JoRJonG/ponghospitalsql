import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

// Create a DOMPurify instance with JSDOM for server-side
const window = new JSDOM('').window
const DOMPurifyServer = DOMPurify(window)

/**
 * Sanitize HTML input to prevent XSS
 * @param {string} input - The input string to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeHtml(input) {
  if (typeof input !== 'string') return input
  return DOMPurifyServer.sanitize(input, {
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
export function sanitizeText(input) {
  if (typeof input !== 'string') return input
  return DOMPurifyServer.sanitize(input, { ALLOWED_TAGS: [] })
}