import { useState } from 'react'
import Swal from 'sweetalert2'
import { useAuth } from '../../auth/AuthContext'
import ThaIDSettings from './ThaIDSettings'

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
const isStrongPassword = (value: string) => STRONG_PASSWORD_REGEX.test(value)
const PASSWORD_REQUIREMENT_TEXT = 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร พร้อมตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข'

export default function UserSettings() {
    const { getToken, logout } = useAuth()
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [saving, setSaving] = useState(false)

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentPassword || !newPassword) {
            Swal.fire({ title: 'แจ้งเตือน', text: 'กรอกรหัสผ่านให้ครบ', icon: 'warning', confirmButtonText: 'ตกลง', confirmButtonColor: '#dc2626' })
            return
        }
        if (!isStrongPassword(newPassword)) {
            Swal.fire({ title: 'แจ้งเตือน', text: PASSWORD_REQUIREMENT_TEXT, icon: 'warning', confirmButtonText: 'ตกลง', confirmButtonColor: '#dc2626' })
            return
        }
        if (newPassword !== confirmPassword) {
            Swal.fire({ title: 'แจ้งเตือน', text: 'รหัสผ่านใหม่ไม่ตรงกัน', icon: 'warning', confirmButtonText: 'ตกลง', confirmButtonColor: '#dc2626' })
            return
        }
        setSaving(true)
        try {
            const r = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            })
            const j = await r.json().catch(() => null)
            if (!r.ok) {
                Swal.fire({ title: 'ข้อผิดพลาด', text: j?.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ', icon: 'error', confirmButtonText: 'ตกลง', confirmButtonColor: '#dc2626' })
                return
            }
            Swal.fire({
                title: 'สำเร็จ',
                text: 'เปลี่ยนรหัสผ่านสำเร็จ',
                icon: 'success',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#006241'
            })
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } catch (error) {
            console.error('Failed to change password', error)
            Swal.fire({ title: 'ข้อผิดพลาด', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ', icon: 'error', confirmButtonText: 'ตกลง', confirmButtonColor: '#dc2626' })
        } finally {
            setSaving(false)
        }
    }

    const clearForm = () => {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
    }

    return (
        <div className="space-y-6">
            {/* ThaID Settings */}
            <ThaIDSettings />

            <div className="card">
                <div className="card-body">
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <i className="fa-solid fa-key text-emerald-600" />
                            เปลี่ยนรหัสผ่าน
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">จัดการรหัสผ่านสำหรับบัญชีผู้ดูแลระบบของคุณ</p>
                    </div>
                    <form onSubmit={submit} className="space-y-3 max-w-xl">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านเดิม</label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านใหม่</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                required
                            />
                            <p className={`text-xs mt-1 ${newPassword && !isStrongPassword(newPassword) ? 'text-red-600' : 'text-gray-500'}`}>
                                {PASSWORD_REQUIREMENT_TEXT}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ยืนยันรหัสผ่านใหม่</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                required
                            />
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            <button disabled={saving} className="admin-btn admin-btn--add">
                                {saving ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
                            </button>
                            <button type="button" className="admin-btn admin-btn--outline" onClick={clearForm}>
                                ล้างค่า
                            </button>
                        </div>
                        <div className="text-xs text-gray-500 pt-2">
                            หลังเปลี่ยนรหัสผ่าน แนะนำให้ออกจากระบบและเข้าสู่ระบบใหม่
                        </div>
                    </form>
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            className="admin-btn admin-btn--outline inline-flex items-center gap-2"
                            onClick={() => logout?.()}
                        >
                            <i className="fa-solid fa-right-from-bracket" />
                            ออกจากระบบ
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
