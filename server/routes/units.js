import { Router } from 'express'
import { createUploadMiddleware } from '../middleware/upload.js'
import { requireAuth, optionalAuth, requirePermission } from '../middleware/auth.js'
import { microCache } from '../middleware/cache.js'
import { createRateLimiter } from '../middleware/ratelimit.js'
import { validate, unitSchema } from '../utils/validation.js'
import { UnitController } from '../controllers/UnitController.js'

const router = Router()

const upload = createUploadMiddleware({
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: 'image'
})

router.use(createRateLimiter({ windowMs: 10_000, max: 40 }))

router.get('/', optionalAuth, microCache(15_000, 60), UnitController.index)
router.get('/:id', microCache(60_000), UnitController.show)

router.post('/', 
  requireAuth, 
  requirePermission('units'), 
  upload.single('image'), 
  validate(unitSchema), 
  UnitController.create
)

router.put('/:id', 
  requireAuth, 
  requirePermission('units'), 
  upload.single('image'), 
  validate(unitSchema), 
  UnitController.update
)

router.delete('/:id', 
  requireAuth, 
  requirePermission('units'), 
  UnitController.destroy
)

export default router
