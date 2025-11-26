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
