import { JSDOM } from 'jsdom'
import DOMPurify from 'dompurify'

const window = new JSDOM('').window
const DOMPurifyServer = DOMPurify(window)

/**
 * Middleware to prevent HTTP Parameter Pollution (HPP)
 * Ensures that specific parameters are strings, not arrays.
 * This prevents attackers from sending multiple values for a parameter that expects a single value.
 */
export const preventHpp = (req, res, next) => {
    if (req.query) {
        for (const key in req.query) {
            if (Array.isArray(req.query[key])) {
                // Take the last value if multiple are provided (common strategy)
                req.query[key] = req.query[key][req.query[key].length - 1]
            }
        }
    }
    next()
}

/**
 * Middleware to sanitize user input to prevent XSS.
 * It recursively sanitizes strings in req.body, req.query, and req.params.
 */
export const xssSanitizer = (req, res, next) => {
    const sanitize = (obj) => {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                obj[key] = DOMPurifyServer.sanitize(obj[key])
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitize(obj[key])
            }
        }
    }

    if (req.body) sanitize(req.body)
    if (req.query) sanitize(req.query)
    if (req.params) sanitize(req.params)

    next()
}

/**
 * Middleware to validate Origin/Referer headers to prevent CSRF.
 * Checks that state-changing requests (POST, PUT, DELETE, PATCH) originate from the same site.
 * This is a stateless CSRF protection mechanism recommended by OWASP.
 */
export const validateOrigin = (req, res, next) => {
    // Skip for safe methods (GET, HEAD, OPTIONS)
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next()
    }

    const origin = req.headers.origin
    const referer = req.headers.referer
    const host = req.headers.host

    // Allow requests from allowed origins (defined in .env for CORS)
    // This allows localhost:5173 (frontend) to talk to localhost:5000 (backend) in dev
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)

    // Add default dev origins if not specified
    if (process.env.NODE_ENV !== 'production') {
        allowedOrigins.push('http://localhost:5173')
        allowedOrigins.push('http://localhost:5174')
        allowedOrigins.push('http://localhost:5175')
        allowedOrigins.push('http://localhost:3000')
    }

    if (origin) {
        // origin usually looks like "https://example.com" or "http://localhost:3000"
        const originHost = origin.replace(/^https?:\/\//, '')

        // Check if origin matches host OR is in allowed origins
        if (originHost !== host && !allowedOrigins.some(allowed => allowed.includes(originHost))) {
            return res.status(403).json({ error: 'CSRF Protection: Origin mismatch' })
        }
    } else if (referer) {
        // referer usually looks like "https://example.com/page"
        try {
            const refererUrl = new URL(referer)
            if (refererUrl.host !== host && !allowedOrigins.some(allowed => allowed.includes(refererUrl.host))) {
                return res.status(403).json({ error: 'CSRF Protection: Referer mismatch' })
            }
        } catch (e) {
            // Invalid referer URL
            return res.status(403).json({ error: 'CSRF Protection: Invalid Referer' })
        }
    }

    next()
}
