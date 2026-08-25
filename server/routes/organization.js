import { Router } from 'express'
import { createUploadMiddleware } from '../middleware/upload.js'
import { requireAuth, optionalAuth, requirePermission } from '../middleware/auth.js'
import { validate, organizationSchema } from '../utils/validation.js'
import { OrganizationController } from '../controllers/OrganizationController.js'

const router = Router()

const upload = createUploadMiddleware({
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: 'image'
})

// List organization charts
router.get('/', optionalAuth, OrganizationController.index)

// Create
router.post('/', 
  requireAuth, 
  requirePermission('organization'), 
  upload.single('image'), 
  validate(organizationSchema),
  OrganizationController.create
)

// Update
router.put('/:id', 
  requireAuth, 
  requirePermission('organization'), 
  upload.single('image'), 
  validate(organizationSchema),
  OrganizationController.update
)

// Delete
router.delete('/:id', 
  requireAuth, 
  requirePermission('organization'), 
  OrganizationController.destroy
)

// Reorder
router.post('/reorder', 
  requireAuth, 
  requirePermission('organization'), 
  OrganizationController.reorder
)

export default router
