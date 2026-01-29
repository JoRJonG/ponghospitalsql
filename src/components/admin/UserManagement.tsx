import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import Swal from 'sweetalert2'
import { apiRequest } from '../../utils/api'

import { motion, AnimatePresence } from 'framer-motion'

export type UserManagementHandle = {
  refresh: () => Promise<void>
}

export type ManagedUser = {
  id: number
  username: string
  roles: string[]
  permissions: string[]
  createdAt?: string
  updatedAt?: string
  isActive: boolean
}

type UserFormState = {
  username: string
  password: string
  permissions: string[]
  isActive: boolean
}

type PermissionOption = {
  value: string
  label: string
  description: string
}

const PERMISSION_OPTIONS: PermissionOption[] = [
  { value: 'dashboard', label: 'แดชบอร์ด', description: 'เข้าถึงหน้าแดชบอร์ดภาพรวม' },
  { value: 'popups', label: 'ป๊อปอัปหน้าแรก', description: 'จัดการป๊อปอัปและรูปภาพในหน้าแรก' },
  { value: 'announcements', label: 'ประกาศ', description: 'เพิ่ม/แก้ไข/ลบประกาศ' },
  { value: 'activities', label: 'กิจกรรม', description: 'เพิ่ม/แก้ไข/ลบกิจกรรม' },
  { value: 'slides', label: 'สไลด์', description: 'จัดการรูปสไลด์ในหน้าแรก' },
  { value: 'units', label: 'หน่วยงาน', description: 'แก้ไขลิงก์หน่วยงาน' },
  { value: 'executives', label: 'ผู้บริหาร', description: 'แก้ไขข้อมูลผู้บริหาร' },
  { value: 'infographics', label: 'Infographic', description: 'จัดการรูปภาพ Infographic' },
  { value: 'ita', label: 'ITA', description: 'จัดการเมนู ITA' },
  { value: 'documents', label: 'เอกสารดาวน์โหลด', description: 'จัดการไฟล์เอกสารและหมวดหมู่' },
  { value: 'feedback', label: 'ความคิดเห็น', description: 'ดูและจัดการความคิดเห็นจากผู้ใช้' },
  { value: 'users', label: 'ผู้ใช้', description: 'จัดการบัญชีผู้ใช้และสิทธิ์' },
  { value: 'system', label: 'ระบบ', description: 'เข้าถึงการตั้งค่าระบบเพิ่มเติม' },
]

const PERMISSION_LABEL_MAP = PERMISSION_OPTIONS.reduce<Record<string, string>>((acc, opt) => {
  acc[opt.value] = opt.label
  return acc
}, {})

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
const isStrongPassword = (value: string) => STRONG_PASSWORD_REGEX.test(value)
const PASSWORD_REQUIREMENT_TEXT = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร พร้อมตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข'

const EMPTY_FORM: UserFormState = {
  username: '',
  password: '',
  permissions: [],
  isActive: true,
}



function formatDateTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  try {
    return date.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return date.toISOString()
  }
}

type ErrorResponse = {
  success?: boolean
  error?: string
  message?: string
}

async function readJson(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

type UserFormCardProps = {
  mode: 'create' | 'edit'
  form: UserFormState
  onChange: (next: UserFormState) => void
  onSubmit: () => Promise<void>
  onCancel: () => void
  submitting: boolean
  disableUsername?: boolean
}

function UserFormCard({ mode, form, onChange, onSubmit, onCancel, submitting, disableUsername }: UserFormCardProps) {
  const trimmedPassword = form.password.trim()
  const passwordValid = mode === 'create'
    ? isStrongPassword(trimmedPassword)
    : (trimmedPassword === '' || isStrongPassword(trimmedPassword))
  const showPasswordError = trimmedPassword.length > 0 && !isStrongPassword(trimmedPassword)
  const trimmedUsername = form.username.trim()
  const canSubmit = !submitting
    && (mode !== 'create' || trimmedUsername.length >= 3)
    && passwordValid

  const togglePermission = (permission: string) => {
    onChange({
      ...form,
      permissions: form.permissions.includes(permission)
        ? form.permissions.filter(p => p !== permission)
        : [...form.permissions, permission],
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            {mode === 'create' ? 'เพิ่มผู้ใช้ใหม่' : `แก้ไขผู้ใช้: ${form.username}`}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'create'
              ? 'กรอกข้อมูลเพื่อสร้างบัญชีผู้ดูแลระบบคนใหม่'
              : 'ปรับปรุงข้อมูลและสิทธิ์การเข้าถึงของผู้ใช้'}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <span className="sr-only">Close</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">ชื่อผู้ใช้ <span className="text-red-500">*</span></span>
            <input
              type="text"
              value={form.username}
              autoComplete="off"
              disabled={disableUsername}
              onChange={e => onChange({ ...form, username: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500 transition-shadow"
              placeholder="เช่น staff01"
            />
            {mode === 'create' && <p className="mt-1 text-xs text-gray-500">อย่างน้อย 3 ตัวอักษร (A-Z, 0-9)</p>}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              {mode === 'create' ? 'รหัสผ่าน' : 'รหัสผ่านใหม่'}
              {mode === 'create' && <span className="text-red-500">*</span>}
            </span>
            <input
              type="password"
              value={form.password}
              autoComplete="new-password"
              onChange={e => onChange({ ...form, password: e.target.value })}
              className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 transition-shadow ${showPasswordError
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                }`}
              placeholder={mode === 'create' ? 'ตั้งรหัสผ่านที่ปลอดภัย' : 'เว้นว่างไว้หากไม่ต้องการเปลี่ยน'}
            />
            {showPasswordError ? (
              <p className="mt-1 text-xs text-red-600">{PASSWORD_REQUIREMENT_TEXT}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">ตัวพิมพ์ใหญ่ + เล็ก + ตัวเลข (อย่างน้อย 8 ตัว)</p>
            )}
          </label>

          <div className={`rounded-xl border p-4 ${form.isActive ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className={`text-sm font-semibold ${form.isActive ? 'text-emerald-900' : 'text-gray-700'}`}>
                  สถานะบัญชี
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {form.isActive ? 'สามารถเข้าใช้งานระบบได้ปกติ' : 'ถูกระงับการใช้งานชั่วคราว'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onChange({ ...form, isActive: !form.isActive })}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${form.isActive ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${form.isActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">สิทธิ์การเข้าถึง</h4>
            <span className="text-xs text-gray-500">{form.permissions.length} รายการที่เลือก</span>
          </div>
          <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {PERMISSION_OPTIONS.map(option => {
              const checked = form.permissions.includes(option.value)
              return (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all ${checked
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className="flex h-5 items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={checked}
                      onChange={() => togglePermission(option.value)}
                    />
                  </div>
                  <div className="text-sm">
                    <span className={`block font-medium ${checked ? 'text-blue-900' : 'text-gray-900'}`}>{option.label}</span>
                    <span className={`block text-xs ${checked ? 'text-blue-700' : 'text-gray-500'}`}>{option.description}</span>
                  </div>
                </label>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ${canSubmit
            ? 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg focus:ring-blue-500'
            : 'bg-gray-400 cursor-not-allowed'
            }`}
        >
          {submitting && (
            <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {mode === 'create' ? 'สร้างบัญชีผู้ใช้' : 'บันทึกการเปลี่ยนแปลง'}
        </button>
      </div>
    </div>
  )
}

const UserManagement = forwardRef<UserManagementHandle>(function UserManagement(_props, ref) {

  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [creating, setCreating] = useState(false)
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null)

  const [form, setForm] = useState<UserFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setCreating(false)
    setEditingUser(null)
  }

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiRequest('/api/users')
      const json = (await readJson(response)) as { success?: boolean; data?: ManagedUser[]; error?: string } | null
      if (!response.ok || !json?.success) {
        setError(json?.error || 'ไม่สามารถโหลดรายชื่อผู้ใช้ได้')
        setUsers([])
        return
      }
      setUsers(json.data || [])
    } catch (err) {
      console.error('[UserManagement] load error:', err)
      setError('ไม่สามารถโหลดรายชื่อผู้ใช้ได้')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useImperativeHandle(ref, () => ({ refresh: loadUsers }), [loadUsers])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleCreate = async () => {
    if (saving) return
    const trimmedPassword = form.password.trim()
    if (!isStrongPassword(trimmedPassword)) {
      Swal.fire({ title: 'ข้อผิดพลาด', text: PASSWORD_REQUIREMENT_TEXT, icon: 'error', confirmButtonText: 'ตกลง', confirmButtonColor: '#d33' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        username: form.username.trim(),
        password: trimmedPassword,
        permissions: form.permissions,
        isActive: form.isActive,
      }
      const response = await apiRequest('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = (await readJson(response)) as ErrorResponse & { data?: ManagedUser }
      if (!response.ok || json?.success === false) {
        throw new Error(json?.error || json?.message || 'สร้างผู้ใช้ไม่สำเร็จ')
      }
      Swal.fire({
        title: 'สำเร็จ',
        text: 'เพิ่มผู้ใช้ใหม่สำเร็จ',
        icon: 'success',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#10b981'
      })
      resetForm()
      await loadUsers()
    } catch (thrown: unknown) {
      console.error('[UserManagement] create error:', thrown)
      const message = thrown instanceof Error ? thrown.message : 'สร้างผู้ใช้ไม่สำเร็จ'
      Swal.fire({ title: 'ข้อผิดพลาด', text: message, icon: 'error', confirmButtonText: 'ตกลง', confirmButtonColor: '#d33' })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingUser || updating) return
    const trimmedPassword = form.password.trim()
    if (trimmedPassword && !isStrongPassword(trimmedPassword)) {
      Swal.fire({ title: 'ข้อผิดพลาด', text: PASSWORD_REQUIREMENT_TEXT, icon: 'error', confirmButtonText: 'ตกลง', confirmButtonColor: '#d33' })
      return
    }
    setUpdating(true)
    try {
      const payload: { permissions: string[]; password?: string; isActive: boolean } = {
        permissions: form.permissions,
        isActive: form.isActive,
      }
      if (trimmedPassword) {
        payload.password = trimmedPassword
      }
      const response = await apiRequest(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = (await readJson(response)) as ErrorResponse & { data?: ManagedUser }
      if (!response.ok || json?.success === false) {
        throw new Error(json?.error || json?.message || 'อัปเดตผู้ใช้ไม่สำเร็จ')
      }
      Swal.fire({
        title: 'สำเร็จ',
        text: 'บันทึกการเปลี่ยนแปลงสำเร็จ',
        icon: 'success',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#10b981'
      })
      resetForm()
      await loadUsers()
    } catch (thrown: unknown) {
      console.error('[UserManagement] update error:', thrown)
      const message = thrown instanceof Error ? thrown.message : 'อัปเดตผู้ใช้ไม่สำเร็จ'
      Swal.fire({ title: 'ข้อผิดพลาด', text: message, icon: 'error', confirmButtonText: 'ตกลง', confirmButtonColor: '#d33' })
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async (user: ManagedUser) => {
    if (deletingId || !user) return
    const result = await Swal.fire({
      title: 'ยืนยันการลบ?',
      text: `ต้องการลบบัญชี "${user.username}" หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    })
    if (!result.isConfirmed) return
    setDeletingId(user.id)
    try {
      const response = await apiRequest(`/api/users/${user.id}`, { method: 'DELETE' })
      const json = (await readJson(response)) as ErrorResponse
      if (!response.ok || json?.success === false) {
        throw new Error(json?.error || json?.message || 'ลบบัญชีไม่สำเร็จ')
      }
      Swal.fire({
        title: 'สำเร็จ',
        text: 'ลบบัญชีผู้ใช้สำเร็จ',
        icon: 'success',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#10b981'
      })
      if (editingUser?.id === user.id) {
        resetForm()
      }
      await loadUsers()
    } catch (thrown: unknown) {
      console.error('[UserManagement] delete error:', thrown)
      const message = thrown instanceof Error ? thrown.message : 'ลบบัญชีไม่สำเร็จ'
      Swal.fire({ title: 'ข้อผิดพลาด', text: message, icon: 'error', confirmButtonText: 'ตกลง', confirmButtonColor: '#d33' })
    } finally {
      setDeletingId(null)
    }
  }

  const hasUsers = users.length > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">รายชื่อผู้ใช้</h2>
          <p className="text-sm text-gray-600">เพิ่มและกำหนดสิทธิ์ให้ผู้ดูแลแต่ละคนได้จากหน้านี้</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setCreating(true)
              setEditingUser(null)
              setForm(EMPTY_FORM)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 shadow-sm transition-all hover:shadow-md"
          >
            <span className="text-lg">+</span>
            <span className="font-medium">เพิ่มผู้ใช้</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              className="text-red-600 underline hover:text-red-800"
              onClick={loadUsers}
            >
              ลองอีกครั้ง
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white p-12 text-gray-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
          <span>กำลังโหลดรายชื่อผู้ใช้...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {!hasUsers ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-12 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900">ยังไม่มีผู้ดูแลระบบ</h3>
              <p className="text-gray-500 mt-1">เริ่มต้นด้วยการเพิ่มผู้ใช้คนแรก</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ชื่อผู้ใช้</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">สถานะ</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">สิทธิ์ที่มี</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">อัปเดตล่าสุด</th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{user.username}</div>
                              <div className="text-xs text-gray-500">{user.roles.join(', ')}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isActive
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-gray-100 text-gray-800 border border-gray-200'
                              }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.isActive ? 'bg-emerald-500' : 'bg-gray-500'}`}></span>
                            {user.isActive ? 'ใช้งานอยู่' : 'ระงับการใช้งาน'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {user.permissions?.length ? (
                              user.permissions.slice(0, 4).map(perm => (
                                <span
                                  key={perm}
                                  className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                                >
                                  {PERMISSION_LABEL_MAP[perm] || perm}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400 italic">ไม่มีสิทธิ์พิเศษ</span>
                            )}
                            {user.permissions?.length > 4 && (
                              <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                +{user.permissions.length - 4}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(user.updatedAt || user.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUser(user)
                                setCreating(false)
                                setForm({
                                  username: user.username,
                                  password: '',
                                  permissions: user.permissions || [],
                                  isActive: user.isActive,
                                })
                              }}
                              className="text-indigo-600 hover:text-indigo-900 p-1.5 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="แก้ไข"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(user)}
                              disabled={deletingId === user.id}
                              className={`p-1.5 rounded-lg transition-colors ${deletingId === user.id
                                ? 'text-gray-400'
                                : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                                }`}
                              title="ลบ"
                            >
                              {deletingId === user.id ? (
                                <span className="block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {(creating || editingUser) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0.3 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden my-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="max-h-[85vh] overflow-y-auto p-6">
                <UserFormCard
                  mode={creating ? 'create' : 'edit'}
                  form={form}
                  onChange={setForm}
                  onCancel={resetForm}
                  onSubmit={creating ? handleCreate : handleUpdate}
                  submitting={creating ? saving : updating}
                  disableUsername={!creating}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

export default UserManagement
