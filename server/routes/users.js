import { Router } from 'express'
import bcryptPkg from 'bcryptjs'
import User from '../models/mysql/User.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()
const { hash } = bcryptPkg

const PERMISSION_OPTIONS = new Set([
  'dashboard',
  'popups',
  'announcements',
  'activities',
  'slides',
  'units',
  'executives',
  'ita',
  'users',
  'system',
])

function sanitizePermissions(perms) {
  if (!Array.isArray(perms)) return []
  return Array.from(new Set(perms.filter(p => typeof p === 'string' && PERMISSION_OPTIONS.has(p))))
}

function toPublicUser(user) {
  if (!user) return null
  return {
    id: user._id ?? user.id,
    username: user.username,
    roles: user.roles || [],
    permissions: user.permissions || [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

router.get('/', requireAuth, requirePermission('users'), async (req, res) => {
  try {
    const users = await User.findAll(200, 0)
    res.json({ success: true, data: users.map(toPublicUser) })
  } catch (error) {
    console.error('[users] list error:', error?.message)
    res.status(500).json({ success: false, error: 'ไม่สามารถดึงรายชื่อผู้ใช้ได้' })
  }
})

router.post('/', requireAuth, requirePermission('users'), async (req, res) => {
  try {
    const { username, password, permissions = [] } = req.body || {}
    if (!username || typeof username !== 'string' || username.length < 3) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุชื่อผู้ใช้อย่างน้อย 3 ตัวอักษร' })
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุรหัสผ่านอย่างน้อย 6 ตัวอักษร' })
    }
    const existing = await User.findByUsername(username)
    if (existing) {
      return res.status(409).json({ success: false, error: 'มีชื่อผู้ใช้นี้อยู่แล้ว' })
    }
    const passwordHash = await hash(password, 10)
    const sanitizedPermissions = sanitizePermissions(permissions)
    const created = await User.create({ username, passwordHash, roles: ['editor'], permissions: sanitizedPermissions })
    res.status(201).json({ success: true, data: toPublicUser(created) })
  } catch (error) {
    console.error('[users] create error:', error?.message)
    res.status(500).json({ success: false, error: 'ไม่สามารถสร้างผู้ใช้ได้' })
  }
})

router.put('/:id', requireAuth, requirePermission('users'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ success: false, error: 'รหัสผู้ใช้ไม่ถูกต้อง' })

    const target = await User.findById(id)
    if (!target) return res.status(404).json({ success: false, error: 'ไม่พบบัญชีผู้ใช้' })

    // Prevent removing own admin/permissions accidentally
    if (req.user?.sub && Number(req.user.sub) === id) {
      if (!Array.isArray(req.body?.permissions) || !req.body.permissions.includes('users')) {
        return res.status(400).json({ success: false, error: 'ไม่สามารถลบสิทธิ์จัดการผู้ใช้ของตนเองได้' })
      }
    }

    const payload = {
      roles: target.roles,
      permissions: target.permissions,
      passwordHash: undefined,
    }

    if (Array.isArray(req.body?.permissions)) {
      payload.permissions = sanitizePermissions(req.body.permissions)
    }

    if (req.body?.password) {
      if (typeof req.body.password !== 'string' || req.body.password.length < 6) {
        return res.status(400).json({ success: false, error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' })
      }
      payload.passwordHash = await hash(req.body.password, 10)
    }

    const updated = await User.updateById(id, payload)
    res.json({ success: true, data: toPublicUser(updated) })
  } catch (error) {
    console.error('[users] update error:', error?.message)
    res.status(500).json({ success: false, error: 'ไม่สามารถอัปเดตผู้ใช้ได้' })
  }
})

router.delete('/:id', requireAuth, requirePermission('users'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ success: false, error: 'รหัสผู้ใช้ไม่ถูกต้อง' })

    if (req.user?.sub && Number(req.user.sub) === id) {
      return res.status(400).json({ success: false, error: 'ไม่สามารถลบบัญชีของตนเองได้' })
    }

    const target = await User.findById(id)
    if (!target) return res.status(404).json({ success: false, error: 'ไม่พบบัญชีผู้ใช้' })

    const admins = await User.findAll(500, 0)
    const adminCount = admins.filter(u => Array.isArray(u.roles) && u.roles.includes('admin')).length
    if (target.roles?.includes('admin') && adminCount <= 1) {
      return res.status(400).json({ success: false, error: 'ต้องมีผู้ดูแลระบบอย่างน้อย 1 คน' })
    }

    await User.deleteById(id)
    res.json({ success: true })
  } catch (error) {
    console.error('[users] delete error:', error?.message)
    res.status(500).json({ success: false, error: 'ไม่สามารถลบบัญชีผู้ใช้ได้' })
  }
})

export default router
