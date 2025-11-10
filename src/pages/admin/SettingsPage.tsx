import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/AuthContext.tsx'
import { useTheme, type GrayscaleMode } from '../../contexts/ThemeContext'
import { buildApiUrl } from '../../utils/api'

export default function SettingsPage() {
  const { getToken, logout } = useAuth() as any
  const { grayscaleMode, refreshDisplayMode } = useTheme()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [displayMode, setDisplayMode] = useState<GrayscaleMode>(grayscaleMode)
  const [modeSaving, setModeSaving] = useState(false)
  const [modeMessage, setModeMessage] = useState<string | null>(null)
  const [modeError, setModeError] = useState<string | null>(null)

  useEffect(() => {
    if (!modeSaving) {
      setDisplayMode(grayscaleMode)
    }
  }, [grayscaleMode, modeSaving])

  const displayModeOptions = useMemo(() => ([
    {
      value: 'force-on' as GrayscaleMode,
      title: 'บังคับโหมดขาวดำ',
      description: 'ทุกหน้าจะแสดงเป็นโทนขาวดำ และผู้เข้าชมจะไม่สามารถเปลี่ยนได้',
      icon: 'fa-droplet'
    },
    {
      value: 'force-off' as GrayscaleMode,
      title: 'บังคับโหมดสีปกติ',
      description: 'แสดงเว็บไซต์ด้วยสีปกติ และผู้เข้าชมจะไม่สามารถเปลี่ยนได้',
      icon: 'fa-circle-half-stroke'
    }
  ]), [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null); setError(null)
    if (!currentPassword || !newPassword) { setError('กรอกรหัสผ่านให้ครบ'); return }
    if (newPassword.length < 6) { setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'); return }
    if (newPassword !== confirmPassword) { setError('รหัสผ่านใหม่ไม่ตรงกัน'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ currentPassword, newPassword })
      })
      const j = await r.json().catch(()=>null)
      if (!r.ok) { setError(j?.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ'); return }
      setMessage('เปลี่ยนรหัสผ่านสำเร็จ')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (e) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally { setSaving(false) }
  }

  const submitDisplayMode = async (e: React.FormEvent) => {
    e.preventDefault()
    setModeMessage(null); setModeError(null)
    setModeSaving(true)
    try {
      const response = await fetch(buildApiUrl('/api/system/display-mode'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ mode: displayMode })
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.success) {
        const message = result?.error || 'ไม่สามารถบันทึกโหมดการแสดงผลได้'
        throw new Error(message)
      }
      await refreshDisplayMode()
      setModeMessage('บันทึกโหมดการแสดงผลสำเร็จ')
      if (result?.data?.mode) {
        setDisplayMode(result.data.mode as GrayscaleMode)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ไม่สามารถบันทึกโหมดการแสดงผลได้'
      setModeError(message)
    } finally {
      setModeSaving(false)
    }
  }

  const resetDisplayMode = () => {
    setDisplayMode(grayscaleMode)
    setModeMessage(null)
    setModeError(null)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <i className="fa-solid fa-gear text-lg" />
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">ตั้งค่า</h1>
        </div>
        <p className="mt-2 text-gray-700 text-sm md:text-base">จัดการการตั้งค่าเว็บไซต์และบัญชีผู้ดูแลระบบ</p>
      </div>

      <div className="card mb-6">
        <div className="card-body space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <i className="fa-solid fa-circle-half-stroke text-emerald-600" />
              การแสดงผลเว็บไซต์
            </h2>
            <p className="mt-1 text-sm text-gray-600">เลือกรูปแบบสีที่ต้องการแสดงให้ผู้เข้าชมเห็นบนทุกหน้า</p>
          </div>
          {modeError && <div className="border border-red-200 bg-red-50 text-red-700 rounded px-3 py-2 text-sm">{modeError}</div>}
          {modeMessage && <div className="border border-green-200 bg-green-50 text-green-700 rounded px-3 py-2 text-sm">{modeMessage}</div>}
          <form onSubmit={submitDisplayMode} className="space-y-4">
            <div className="space-y-3">
              {displayModeOptions.map(option => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition ${displayMode === option.value ? 'border-emerald-400 bg-emerald-50/40' : 'border-gray-200 hover:border-emerald-200'}`}
                >
                  <input
                    type="radio"
                    name="displayMode"
                    value={option.value}
                    className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                    checked={displayMode === option.value}
                    onChange={() => { setDisplayMode(option.value); setModeMessage(null); setModeError(null) }}
                    disabled={modeSaving}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <i className={`fa-solid ${option.icon} text-emerald-600`} />
                      <span className="font-medium text-gray-900">{option.title}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button type="submit" className="btn btn-primary" disabled={modeSaving}>
                {modeSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={modeSaving || displayMode === grayscaleMode}
                onClick={resetDisplayMode}
              >
                รีเซ็ต
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={submit} className="space-y-3 max-w-xl">
            {error && <div className="border border-red-200 bg-red-50 text-red-700 rounded px-3 py-2 text-sm">{error}</div>}
            {message && <div className="border border-green-200 bg-green-50 text-green-700 rounded px-3 py-2 text-sm">{message}</div>}
            <div>
              <label className="block text-sm mb-1">รหัสผ่านเดิม</label>
              <input type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className="w-full rounded border px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm mb-1">รหัสผ่านใหม่</label>
              <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="w-full rounded border px-3 py-2" required />
              <p className="text-xs text-gray-500 mt-1">อย่างน้อย 8 ตัวอักษร แนะนำให้ใช้ตัวพิมพ์เล็ก-ใหญ่ ตัวเลข และสัญลักษณ์</p>
            </div>
            <div>
              <label className="block text-sm mb-1">ยืนยันรหัสผ่านใหม่</label>
              <input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="w-full rounded border px-3 py-2" required />
            </div>
            <div className="flex items-center gap-2">
              <button disabled={saving} className="btn btn-primary">{saving? 'กำลังบันทึก...':'เปลี่ยนรหัสผ่าน'}</button>
              <button type="button" className="btn btn-outline" onClick={()=>{ setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setError(null); setMessage(null) }}>ล้างค่า</button>
            </div>
            <div className="text-xs text-gray-500">หลังเปลี่ยนรหัสผ่าน แนะนำให้ออกจากระบบและเข้าสู่ระบบใหม่</div>
          </form>
          <div className="mt-6">
            <button type="button" className="btn btn-outline" onClick={()=>logout?.()}>ออกจากระบบ</button>
          </div>
        </div>
      </div>
    </div>
  )
}
