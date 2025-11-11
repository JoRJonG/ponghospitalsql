import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import { apiRequest } from '../../utils/api'
import { useToast } from '../../contexts/ToastContext'

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
}

type UserFormState = {
  username: string
  password: string
  permissions: string[]
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
  { value: 'ita', label: 'ITA', description: 'จัดการเมนู ITA' },
  { value: 'users', label: 'ผู้ใช้', description: 'จัดการบัญชีผู้ใช้และสิทธิ์' },
  { value: 'system', label: 'ระบบ', description: 'เข้าถึงการตั้งค่าระบบเพิ่มเติม' },
]

const PERMISSION_LABEL_MAP = PERMISSION_OPTIONS.reduce<Record<string, string>>((acc, opt) => {
  acc[opt.value] = opt.label
  return acc
}, {})

const EMPTY_FORM: UserFormState = {
  username: '',
  password: '',
  permissions: [],
}

const TOAST_DURATION = 3000

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
  const togglePermission = (permission: string) => {
    onChange({
      ...form,
      permissions: form.permissions.includes(permission)
        ? form.permissions.filter(p => p !== permission)
        : [...form.permissions, permission],
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'เพิ่มผู้ใช้ใหม่' : `แก้ไขผู้ใช้: ${form.username}`}
          </h3>
          <p className="text-sm text-gray-600">
            {mode === 'create'
              ? 'ระบุชื่อผู้ใช้ รหัสผ่าน และสิทธิ์ที่ต้องการ'
              : 'ปรับสิทธิ์การเข้าถึง หรือรีเซ็ตรหัสผ่านของผู้ใช้'}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="admin-btn admin-btn--outline"
        >
          ยกเลิก
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          <span>ชื่อผู้ใช้</span>
          <input
            type="text"
            value={form.username}
            autoComplete="off"
            disabled={disableUsername}
            onChange={e => onChange({ ...form, username: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
            placeholder="เช่น staff01"
          />
          {mode === 'create' && <span className="text-xs text-gray-400">อย่างน้อย 3 ตัวอักษร ใช้ตัวอักษร/ตัวเลขเท่านั้น</span>}
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-700">
          <span>{mode === 'create' ? 'รหัสผ่าน (อย่างน้อย 6 ตัว)' : 'รหัสผ่านใหม่ (ถ้าต้องการเปลี่ยน)'}</span>
          <input
            type="password"
            value={form.password}
            autoComplete="new-password"
            onChange={e => onChange({ ...form, password: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            placeholder={mode === 'create' ? 'ตั้งรหัสผ่าน' : 'ปล่อยว่างหากไม่เปลี่ยน'}
          />
        </label>
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">สิทธิ์การเข้าถึง</h4>
          <p className="text-xs text-gray-500">เลือกหลายรายการได้ ผู้ใช้จะสามารถจัดการเฉพาะเมนูที่เลือก</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {PERMISSION_OPTIONS.map(option => {
            const checked = form.permissions.includes(option.value)
            return (
              <label
                key={option.value}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                  checked ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200 hover:border-emerald-300'
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  checked={checked}
                  onChange={() => togglePermission(option.value)}
                />
                <span className="flex-1">
                  <span className="block font-medium text-gray-900">{option.label}</span>
                  <span className="text-xs text-gray-500">{option.description}</span>
                </span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || (mode === 'create' && (!form.username.trim() || form.username.trim().length < 3 || form.password.trim().length < 6))}
          className="admin-btn"
        >
          {submitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              บันทึก...
            </>
          ) : (
            mode === 'create' ? 'บันทึกผู้ใช้ใหม่' : 'บันทึกการเปลี่ยนแปลง'
          )}
        </button>
      </div>
    </div>
  )
}

const UserManagement = forwardRef<UserManagementHandle>(function UserManagement(_props, ref) {
  const { showToast } = useToast()
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
    setSaving(true)
    try {
      const payload = {
        username: form.username.trim(),
        password: form.password.trim(),
        permissions: form.permissions,
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
  showToast('เพิ่มผู้ใช้ใหม่สำเร็จ', undefined, 'success', TOAST_DURATION)
      resetForm()
      await loadUsers()
    } catch (thrown: unknown) {
      console.error('[UserManagement] create error:', thrown)
      const message = thrown instanceof Error ? thrown.message : 'สร้างผู้ใช้ไม่สำเร็จ'
  showToast(message, undefined, 'error', TOAST_DURATION)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingUser || updating) return
    setUpdating(true)
    try {
      const payload: { permissions: string[]; password?: string } = {
        permissions: form.permissions,
      }
      const trimmedPassword = form.password.trim()
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
  showToast('บันทึกการเปลี่ยนแปลงสำเร็จ', undefined, 'success', TOAST_DURATION)
      resetForm()
      await loadUsers()
    } catch (thrown: unknown) {
      console.error('[UserManagement] update error:', thrown)
      const message = thrown instanceof Error ? thrown.message : 'อัปเดตผู้ใช้ไม่สำเร็จ'
  showToast(message, undefined, 'error', TOAST_DURATION)
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async (user: ManagedUser) => {
    if (deletingId || !user) return
    const confirmed = window.confirm(`ต้องการลบบัญชี "${user.username}" หรือไม่?`)
    if (!confirmed) return
    setDeletingId(user.id)
    try {
      const response = await apiRequest(`/api/users/${user.id}`, { method: 'DELETE' })
      const json = (await readJson(response)) as ErrorResponse
      if (!response.ok || json?.success === false) {
        throw new Error(json?.error || json?.message || 'ลบบัญชีไม่สำเร็จ')
      }
  showToast('ลบบัญชีผู้ใช้สำเร็จ', undefined, 'success', TOAST_DURATION)
      if (editingUser?.id === user.id) {
        resetForm()
      }
      await loadUsers()
    } catch (thrown: unknown) {
      console.error('[UserManagement] delete error:', thrown)
      const message = thrown instanceof Error ? thrown.message : 'ลบบัญชีไม่สำเร็จ'
  showToast(message, undefined, 'error', TOAST_DURATION)
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
            className="admin-btn"
          >
            <span className="text-base">➕</span>
            <span>เพิ่มผู้ใช้</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              className="text-red-600 underline"
              onClick={loadUsers}
            >
              ลองอีกครั้ง
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white p-6 text-gray-600">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <span>กำลังโหลดรายชื่อผู้ใช้...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {!hasUsers ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
              ยังไม่มีบัญชีผู้ใช้เพิ่มเติม
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left font-medium text-gray-600">ชื่อผู้ใช้</th>
                    <th scope="col" className="px-6 py-3 text-left font-medium text-gray-600">บทบาท</th>
                    <th scope="col" className="px-6 py-3 text-left font-medium text-gray-600">สิทธิ์ที่มี</th>
                    <th scope="col" className="px-6 py-3 text-left font-medium text-gray-600">อัปเดตล่าสุด</th>
                    <th scope="col" className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{user.username}</td>
                      <td className="px-6 py-3 text-gray-700">
                        <div className="flex flex-wrap gap-1">
                          {(user.roles || []).length ? (
                            user.roles.map(role => (
                              <span
                                key={role}
                                className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                              >
                                {role}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.permissions?.length ? (
                            user.permissions.map(perm => (
                              <span
                                key={perm}
                                className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                              >
                                {PERMISSION_LABEL_MAP[perm] || perm}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-gray-500">{formatDateTime(user.updatedAt || user.createdAt)}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="admin-btn admin-btn--outline"
                            onClick={() => {
                              setEditingUser(user)
                              setCreating(false)
                              setForm({ username: user.username, password: '', permissions: user.permissions || [] })
                            }}
                          >
                            <span>✏️</span>
                            <span>แก้ไข</span>
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn--outline"
                            onClick={() => handleDelete(user)}
                            disabled={deletingId === user.id}
                          >
                            {deletingId === user.id ? (
                              <>
                                <span>⏳</span>
                                <span>กำลังลบ...</span>
                              </>
                            ) : (
                              <>
                                <span>🗑️</span>
                                <span>ลบ</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {(creating || editingUser) && (
        <UserFormCard
          mode={creating ? 'create' : 'edit'}
          form={form}
          onChange={setForm}
          onCancel={resetForm}
          onSubmit={creating ? handleCreate : handleUpdate}
          submitting={creating ? saving : updating}
          disableUsername={!creating}
        />
      )}
    </div>
  )
})

export default UserManagement
