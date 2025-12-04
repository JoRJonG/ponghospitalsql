import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../contexts/ToastContext'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await login(username, password)
    if (ok) {
      showToast('เข้าสู่ระบบสำเร็จ', 'ยินดีต้อนรับเข้าสู่ระบบจัดการเว็บไซต์', 'success', 2000)
      navigate('/admin')
    } else {
      showToast('เข้าสู่ระบบไม่สำเร็จ', 'กรุณาตรวจสอบชื่อผู้ใช้และรหัสผ่าน', 'error', 2000)
    }
  }

  return (
    <div className="container-narrow py-12">
      <div className="mx-auto max-w-sm">
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <i className="fa-solid fa-user-shield text-green-600" />
            เข้าสู่ระบบจัดการเว็บไซต์
          </div>
          <div className="card-body">
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">ชื่อผู้ใช้</label>
                <input
                  value={username}
                  onChange={e=>setUsername(e.target.value)}
                  className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="ระบุชื่อผู้ใช้"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">รหัสผ่าน</label>
                <input
                  type="password"
                  value={password}
                  onChange={e=>setPassword(e.target.value)}
                  className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="ระบุรหัสผ่าน"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <button className="btn btn-primary w-full">เข้าสู่ระบบ</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
