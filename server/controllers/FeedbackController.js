import { FeedbackService } from '../services/FeedbackService.js'
import { logger } from '../utils/logger.js'

export const FeedbackController = {
  async index(req, res) {
    if (!req.app.locals.dbConnected) return res.json({ success: true, data: [], pagination: {} })
    try {
      const data = await FeedbackService.getFeedbackList(req.query)
      res.json({ success: true, data: data.feedbacks, pagination: { total: data.total, limit: data.limit, offset: data.offset, hasMore: data.hasMore } })
    } catch (error) {
      logger.error('[FeedbackController] index error:', error)
      res.status(500).json({ error: 'Failed to fetch feedbacks', details: error.message })
    }
  },

  async stats(req, res) {
    if (!req.app.locals.dbConnected) return res.json({ success: true, data: {} })
    try {
      const stats = await FeedbackService.getFeedbackStats()
      res.json({ success: true, data: stats })
    } catch (error) {
      logger.error('[FeedbackController] stats error:', error)
      res.status(500).json({ error: 'Failed to fetch stats', details: error.message })
    }
  },

  async show(req, res) {
    if (!req.app.locals.dbConnected) return res.status(503).json({ error: 'Database unavailable' })
    try {
      const feedback = await FeedbackService.getFeedbackById(req.params.id)
      if (!feedback) return res.status(404).json({ error: 'Feedback not found' })
      res.json({ success: true, data: feedback })
    } catch (error) {
      logger.error('[FeedbackController] show error:', error)
      res.status(500).json({ error: 'Failed to fetch feedback', details: error.message })
    }
  },

  async create(req, res) {
    if (!req.app.locals.dbConnected) return res.status(503).json({ error: 'Database unavailable' })
    try {
      // Input sanitization and format check is handled by validation.js and DTO/Service if needed.
      // We rely on Joi schema for basic rules, but we can do custom sanitizer if needed.
      const feedback = await FeedbackService.createFeedback(req.body)
      res.status(201).json({
        success: true,
        message: 'ส่งความคิดเห็นสำเร็จ ขอบคุณที่ให้ความสนใจ',
        data: { id: feedback.id, created_at: feedback.created_at }
      })
    } catch (error) {
      logger.error('[FeedbackController] create error:', error)
      res.status(500).json({
        error: 'เกิดข้อผิดพลาดในการส่งความคิดเห็น',
        details: process.env.NODE_ENV === 'development' ? error.message : 'กรุณาลองใหม่อีกครั้ง'
      })
    }
  },

  async updateStatus(req, res) {
    if (!req.app.locals.dbConnected) return res.status(503).json({ error: 'Database unavailable' })
    try {
      const readBy = req.user?.username || req.user?.email || 'Admin'
      const feedback = await FeedbackService.updateStatus(req.params.id, req.body.status, readBy)
      if (!feedback) return res.status(404).json({ error: 'Feedback not found' })
      res.json({ success: true, message: 'Status updated', data: feedback })
    } catch (error) {
      logger.error('[FeedbackController] updateStatus error:', error)
      res.status(500).json({ error: 'Failed to update status', details: error.message })
    }
  },

  async reply(req, res) {
    if (!req.app.locals.dbConnected) return res.status(503).json({ error: 'Database unavailable' })
    try {
      const feedback = await FeedbackService.addReply(req.params.id, req.body.reply.trim())
      if (!feedback) return res.status(404).json({ error: 'Feedback not found' })
      res.json({ success: true, message: 'Reply added', data: feedback })
    } catch (error) {
      logger.error('[FeedbackController] reply error:', error)
      res.status(500).json({ error: 'Failed to add reply', details: error.message })
    }
  },

  async destroy(req, res) {
    if (!req.app.locals.dbConnected) return res.status(503).json({ error: 'Database unavailable' })
    try {
      const deleted = await FeedbackService.deleteFeedback(req.params.id)
      if (!deleted) return res.status(404).json({ error: 'Feedback not found' })
      res.json({ success: true, message: 'Feedback deleted' })
    } catch (error) {
      logger.error('[FeedbackController] destroy error:', error)
      res.status(500).json({ error: 'Failed to delete feedback', details: error.message })
    }
  }
}
