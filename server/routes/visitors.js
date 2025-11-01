// Routes for visitor tracking
import express from 'express'
import { Visitor } from '../models/mysql/Visitor.js'
import { optionalAuth } from '../middleware/auth.js'

const router = express.Router()

// Helper to clamp the requested range
function parseRangeDays(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) return fallback
  return Math.min(365, Math.max(1, parsed))
}

// Get visitor statistics for dashboards (includes total, today, average, trend)
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    const rangeDays = parseRangeDays(req.query.range, undefined)
    const stats = await Visitor.getVisitorStats(rangeDays)
    const lifetimeTotal = await Visitor.getVisitorCount()

    res.json({
      success: true,
      data: {
        ...stats,
        lifetimeTotal
      }
    })
  } catch (error) {
    console.error('Error fetching visitor stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch visitor statistics'
    })
  }
})

// Lightweight endpoint for widgets that only need a count within a range (defaults to retention window)
router.get('/count', optionalAuth, async (req, res) => {
  try {
    const rangeDays = parseRangeDays(req.query.range, undefined)
    const count = await Visitor.getVisitorCount(rangeDays)
    res.json({
      success: true,
      data: {
        count,
        rangeDays: rangeDays ?? null
      }
    })
  } catch (error) {
    console.error('Error fetching visitor count:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch visitor count'
    })
  }
})

// Expose raw trend data (e.g. for admin charts)
router.get('/trend', optionalAuth, async (req, res) => {
  try {
    const rangeDays = parseRangeDays(req.query.range, undefined)
    const trend = await Visitor.getDailyVisitors(rangeDays)
    res.json({
      success: true,
      data: {
        rangeDays: rangeDays ?? null,
        trend
      }
    })
  } catch (error) {
    console.error('Error fetching visitor trend:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch visitor trend'
    })
  }
})

router.get('/insights', optionalAuth, async (req, res) => {
  try {
    const rangeDays = parseRangeDays(req.query.range, 30)
    const insights = await Visitor.getVisitorInsights(rangeDays)
    res.json({
      success: true,
      data: insights,
    })
  } catch (error) {
    console.error('Error fetching visitor insights:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch visitor insights'
    })
  }
})

export default router
