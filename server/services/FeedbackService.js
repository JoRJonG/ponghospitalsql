import Feedback from '../models/mysql/Feedback.js'
import { logger } from '../utils/logger.js'

export const FeedbackService = {
  async getFeedbackList(query) {
    const { status, limit = 50, offset = 0, search } = query
    const feedbacks = await Feedback.findAll({
      status,
      limit: parseInt(limit),
      offset: parseInt(offset),
      search
    })
    const total = await Feedback.count({ status, search })
    return {
      feedbacks,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: (parseInt(offset) + feedbacks.length) < total
    }
  },

  async getFeedbackStats() {
    return await Feedback.countByStatus()
  },

  async getFeedbackById(id) {
    return await Feedback.findById(id)
  },

  async createFeedback(payload) {
    const feedback = await Feedback.create(payload)
    logger.info(`[Feedback] New feedback created: ID ${feedback.id} from ${payload.name}`)
    return feedback
  },

  async updateStatus(id, status, readBy) {
    const feedback = await Feedback.updateStatus(id, status, readBy)
    if (feedback) {
      logger.info(`[Feedback] Status updated: ID ${id} -> ${status} by ${readBy}`)
    }
    return feedback
  },

  async addReply(id, reply) {
    const feedback = await Feedback.addReply(id, reply)
    if (feedback) {
      logger.info(`[Feedback] Reply added: ID ${id}`)
    }
    return feedback
  },

  async deleteFeedback(id) {
    const deleted = await Feedback.delete(id)
    if (deleted) {
      logger.info(`[Feedback] Feedback deleted: ID ${id}`)
    }
    return deleted
  }
}
