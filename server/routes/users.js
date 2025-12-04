import { Router } from 'express'
import bcryptPkg from 'bcryptjs'
import User from '../models/mysql/User.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { sanitizeText } from '../utils/sanitization.js'

const router = Router()
const { hash } = bcryptPkg

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

const PERMISSION_OPTIONS = new Set([
  'dashboard',
  'popups',
  'announcements',
  'activities',
  'slides',
  'units',
  'executives',
  'infographics',
  'ita',
  'users',
  'system',
])

function sanitizePermissions(perms) {
  if (!Array.isArray(perms)) return []
  return Array.from(new Set(perms.filter(p => typeof p === 'string' && PERMISSION_OPTIONS.has(p))))
}

function isStrongPassword(password) {
  return typeof password === 'string' && STRONG_PASSWORD_REGEX.test(password)
}

function toPublicUser(user) {
  if (!user) return null
  return {
    id: user._id ?? user.id,
    username: user.username,
    roles: user.roles || [],
    permissions: user.permissions || [],
    isActive: user.isActive !== false,
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
    const { username, password, permissions = [], isActive } = req.body || {}
    const sanitizedUsername = sanitizeText(username || '')
    if (!sanitizedUsername || sanitizedUsername.length < 3) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุชื่อผู้ใช้อย่างน้อย 3 ตัวอักษร' })
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ success: false, error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข' })
    }
    const existing = await User.findByUsername(sanitizedUsername)
    if (existing) {
      return res.status(409).json({ success: false, error: 'มีชื่อผู้ใช้นี้อยู่แล้ว' })
    }
    const passwordHash = await hash(password, 10)
    const sanitizedPermissions = sanitizePermissions(permissions)
    const created = await User.create({
      username: sanitizedUsername,
      passwordHash,
      roles: ['editor'],
      permissions: sanitizedPermissions,
      isActive: typeof isActive === 'boolean' ? isActive : true,
    })
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
      isActive: target.isActive !== false,
    }

    if (Array.isArray(req.body?.permissions)) {
      payload.permissions = sanitizePermissions(req.body.permissions)
    }

    if (req.body?.password) {
      if (!isStrongPassword(req.body.password)) {
        return res.status(400).json({ success: false, error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร และประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข' })
      }
      payload.passwordHash = await hash(req.body.password, 10)
    }

    if (typeof req.body?.isActive === 'boolean') {
      if (req.user?.sub && Number(req.user.sub) === id && req.body.isActive === false) {
        return res.status(400).json({ success: false, error: 'ไม่สามารถระงับบัญชีของตนเองได้' })
      }
      if (req.body.isActive === false && Array.isArray(target.roles) && target.roles.includes('admin')) {
        const admins = await User.findAll(500, 0)
        const activeAdmins = admins.filter(u => Array.isArray(u.roles) && u.roles.includes('admin') && (u.isActive !== false) && u.id !== id)
        if (activeAdmins.length === 0) {
          return res.status(400).json({ success: false, error: 'ต้องมีผู้ดูแลระบบที่เปิดใช้งานอย่างน้อย 1 คน' })
        }
      }
      payload.isActive = req.body.isActive
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
