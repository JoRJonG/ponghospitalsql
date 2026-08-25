import { Router } from 'express'
import { requireAuth, requireRole, requirePermission } from '../middleware/auth.js'
import { validate, displayModeSchema, heroSliderModeSchema, banIpSchema } from '../utils/validation.js'
import { SystemController } from '../controllers/SystemController.js'

const router = Router()

// Display Mode
router.get('/display-mode', SystemController.getDisplayMode)
router.put('/display-mode', 
  requireAuth, 
  requirePermission('system'), 
  validate(displayModeSchema),
  SystemController.updateDisplayMode
)

// Hero Slider Mode
router.get('/hero-slider-mode', SystemController.getHeroSliderMode)
router.put('/hero-slider-mode', 
  requireAuth, 
  requirePermission('system'), 
  validate(heroSliderModeSchema),
  SystemController.updateHeroSliderMode
)

// Banned IPs
router.get('/banned-ips', 
  requireAuth, 
  requireRole('admin'), 
  SystemController.getBannedIps
)

router.post('/banned-ips', 
  requireAuth, 
  requireRole('admin'), 
  validate(banIpSchema),
  SystemController.banIp
)

router.delete('/banned-ips/:ip', 
  requireAuth, 
  requireRole('admin'), 
  SystemController.unbanIp
)

export default router
