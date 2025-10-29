// Middleware to track website visitors
import { Visitor } from '../models/mysql/Visitor.js'

// Track page views and increment visitor count
export function trackVisitors(req, res, next) {
  // Only track GET requests to main pages (not API calls or static files)
  if (req.method === 'GET' &&
      !req.path.startsWith('/api/') &&
      !req.path.includes('.') &&
      !req.path.startsWith('/admin')) {

    // Check if user has already been counted today
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const visitedToday = req.cookies?.visited_today

    if (visitedToday !== today) {
      // Increment visitor count asynchronously (don't block response)
      Visitor.incrementVisitorCount().catch(err => {
        console.error('Error tracking visitor:', err)
      })

      // Set cookie to mark as visited today (expires at end of day)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)

      res.cookie('visited_today', today, {
        expires: tomorrow,
        httpOnly: true,
        secure: req.protocol === 'https',
        sameSite: 'lax'
      })
    }
  }

  next()
}