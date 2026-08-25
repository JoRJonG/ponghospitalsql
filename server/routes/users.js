import { Router } from 'express'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { validate, userSchema } from '../utils/validation.js'
import { UserController } from '../controllers/UserController.js'

const router = Router()

router.get('/', 
  requireAuth, 
  requirePermission('users'), 
  UserController.index
)

router.post('/', 
  requireAuth, 
  requirePermission('users'), 
  validate(userSchema),
  UserController.create
)

router.put('/:id', 
  requireAuth, 
  requirePermission('users'), 
  validate(userSchema),
  UserController.update
)

router.delete('/:id', 
  requireAuth, 
  requirePermission('users'), 
  UserController.destroy
)

export default router
