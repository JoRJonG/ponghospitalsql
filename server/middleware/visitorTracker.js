// Middleware to track website visitors
import { Visitor } from '../models/mysql/Visitor.js'

// Track page views and increment visitor count
export function trackVisitors(req, res, next) {
  // Only track GET requests to main pages (not API calls or static files)
  if (req.method === 'GET' &&
      !req.path.startsWith('/api/') &&
      !req.path.includes('.') &&
      !req.path.startsWith('/admin')) {

    // Increment visitor count asynchronously (don't block response)
    Visitor.incrementVisitorCount().catch(err => {
      console.error('Error tracking visitor:', err)
    })
  }

  next()
}