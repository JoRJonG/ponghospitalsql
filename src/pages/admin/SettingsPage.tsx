import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext.tsx'

export default function SettingsPage() {
  const { getToken, logout } = useAuth() as any
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <i className="fa-solid fa-gear text-lg" />
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">ตั้งค่า</h1>
        </div>
        <p className="mt-2 text-gray-700 text-sm md:text-base">เปลี่ยนรหัสผ่านผู้ดูแลระบบของคุณ</p>
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
