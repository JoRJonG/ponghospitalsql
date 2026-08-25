import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { validate, feedbackSchema, feedbackStatusSchema, feedbackReplySchema } from '../utils/validation.js'
import { FeedbackController } from '../controllers/FeedbackController.js'

const router = Router()

// Rate limiter for feedback submission (5 times per 15 minutes)
const feedbackLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'คุณส่งความคิดเห็นบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง'
})

// Public Endpoints
router.post('/', feedbackLimiter, validate(feedbackSchema), FeedbackController.create)

// Admin Endpoints
router.get('/', requireAuth, requireRole('admin'), FeedbackController.index)
router.get('/stats', requireAuth, requireRole('admin'), FeedbackController.stats)
router.get('/:id', requireAuth, requireRole('admin'), FeedbackController.show)

router.patch('/:id/status', requireAuth, requireRole('admin'), validate(feedbackStatusSchema), FeedbackController.updateStatus)
router.patch('/:id/reply', requireAuth, requireRole('admin'), validate(feedbackReplySchema), FeedbackController.reply)

router.delete('/:id', requireAuth, requireRole('admin'), FeedbackController.destroy)

export default router
