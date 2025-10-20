import rateLimit from 'express-rate-limit'
import { logger } from '../utils/logger.js'

const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production'

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased to 1000 requests per 15min for both dev and prod
  message: { error: 'ขออภัย มีการร้องขอถี่เกินไป กรุณาลองใหม่อีกครั้งภายหลัง' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Global rate limit exceeded', { ip: req.ip, url: req.url, userAgent: req.get('User-Agent') })
    res.status(429).json({ error: 'ขออภัย มีการร้องขอถี่เกินไป กรุณาลองใหม่อีกครั้งภายหลัง' })
  }
})

// Stricter limiter for auth endpoints (more lenient in development)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 50 : 500,
  message: { error: 'การเข้าสู่ระบบล้มเหลวหลายครั้ง กรุณาลองใหม่อีกครั้งภายหลัง' },
  standardHeaders: true,
  legacyHeaders: false,
})

// File upload limiter
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isProd ? 50 : 500, // limit each IP to 50 uploads per hour
  message: { error: 'การอัปโหลดไฟล์ถี่เกินไป กรุณาลองใหม่อีกครั้งภายหลัง' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Legacy function for backward compatibility
export function createRateLimiter({ windowMs = 60_000, max = 100 } = {}) {
  return rateLimit({
    windowMs,
    max,
    message: { error: 'ขออภัย มีการร้องขอถี่เกินไป กรุณาลองใหม่อีกครั้งภายหลัง' },
    standardHeaders: true,
    legacyHeaders: false,
  })
}

export default { createRateLimiter, apiLimiter, authLimiter, uploadLimiter }
