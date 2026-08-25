import User from '../models/mysql/User.js'
import bcryptPkg from 'bcryptjs'
import { sanitizeText } from '../utils/sanitization.js'

const { hash } = bcryptPkg
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

const PERMISSION_OPTIONS = new Set([
  'dashboard', 'popups', 'announcements', 'activities', 'slides', 'units',
  'executives', 'infographics', 'ita', 'feedback', 'documents', 'users',
  'pr_poster', 'organization', 'system', 'pr_plan'
])

export const UserService = {
  async findAll(page = 1, limit = 20) {
    const limitNum = Math.max(1, Math.min(100, limit))
    const offset = (Math.max(1, page) - 1) * limitNum

    const [total, users] = await Promise.all([
      User.countDocuments(),
      User.findAll(limitNum, offset)
    ])
    
    return { 
      users, 
      total, 
      totalPages: Math.ceil(total / limitNum) 
    }
  },

  async createUser(payload) {
    const sanitizedUsername = sanitizeText(payload.username || '')
    if (!sanitizedUsername || sanitizedUsername.length < 3) {
      throw new Error('กรุณาระบุชื่อผู้ใช้อย่างน้อย 3 ตัวอักษร')
    }
    
    if (!this.isStrongPassword(payload.password)) {
      throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข')
    }
    
    const existing = await User.findByUsername(sanitizedUsername)
    if (existing) {
      throw new Error('มีชื่อผู้ใช้นี้อยู่แล้ว')
    }
    
    const passwordHash = await hash(payload.password, 10)
    const sanitizedPermissions = this.sanitizePermissions(payload.permissions)
    
    return await User.create({
      username: sanitizedUsername,
      passwordHash,
      roles: ['editor'],
      permissions: sanitizedPermissions,
      isActive: typeof payload.isActive === 'boolean' ? payload.isActive : true,
    })
  },

  async updateUser(id, payload, requestUser) {
    const target = await User.findById(id)
    if (!target) throw new Error('ไม่พบบัญชีผู้ใช้')

    // Prevent removing own admin/permissions accidentally
    if (requestUser?.sub && Number(requestUser.sub) === id) {
      if (!Array.isArray(payload.permissions) || !payload.permissions.includes('users')) {
        throw new Error('ไม่สามารถลบสิทธิ์จัดการผู้ใช้ของตนเองได้')
      }
    }

    const updateData = {
      roles: target.roles,
      permissions: target.permissions,
      isActive: target.isActive !== false,
    }

    if (Array.isArray(payload.permissions)) {
      updateData.permissions = this.sanitizePermissions(payload.permissions)
    }

    if (payload.password) {
      if (!this.isStrongPassword(payload.password)) {
        throw new Error('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร และประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข')
      }
      updateData.passwordHash = await hash(payload.password, 10)
    }

    if (typeof payload.isActive === 'boolean') {
      if (requestUser?.sub && Number(requestUser.sub) === id && payload.isActive === false) {
        throw new Error('ไม่สามารถระงับบัญชีของตนเองได้')
      }
      
      if (payload.isActive === false && Array.isArray(target.roles) && target.roles.includes('admin')) {
        const admins = await User.findAll(500, 0)
        const activeAdmins = admins.filter(u => Array.isArray(u.roles) && u.roles.includes('admin') && (u.isActive !== false) && u.id !== id)
        if (activeAdmins.length === 0) {
          throw new Error('ต้องมีผู้ดูแลระบบที่เปิดใช้งานอย่างน้อย 1 คน')
        }
      }
      updateData.isActive = payload.isActive
    }

    return await User.updateById(id, updateData)
  },

  async deleteUser(id, requestUser) {
    if (requestUser?.sub && Number(requestUser.sub) === id) {
      throw new Error('ไม่สามารถลบบัญชีของตนเองได้')
    }

    const target = await User.findById(id)
    if (!target) throw new Error('ไม่พบบัญชีผู้ใช้')

    const admins = await User.findAll(500, 0)
    const adminCount = admins.filter(u => Array.isArray(u.roles) && u.roles.includes('admin')).length
    if (target.roles?.includes('admin') && adminCount <= 1) {
      throw new Error('ต้องมีผู้ดูแลระบบอย่างน้อย 1 คน')
    }

    await User.deleteById(id)
    return true
  },

  sanitizePermissions(perms) {
    if (!Array.isArray(perms)) return []
    return Array.from(new Set(perms.filter(p => typeof p === 'string' && PERMISSION_OPTIONS.has(p))))
  },

  isStrongPassword(password) {
    return typeof password === 'string' && STRONG_PASSWORD_REGEX.test(password)
  }
}
