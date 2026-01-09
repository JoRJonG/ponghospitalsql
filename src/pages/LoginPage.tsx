import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import { useAuth } from '../auth/AuthContext'
// import { useToast } from '../contexts/ToastContext'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin', { replace: true })
    }
  }, [isAuthenticated, navigate])
  // const { showToast } = useToast()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await login(username, password)
    if (ok) {
      navigate('/admin', { state: { loginSuccess: true } })
    } else {
      Swal.fire({
        title: 'เข้าสู่ระบบไม่สำเร็จ',
        text: 'กรุณาตรวจสอบชื่อผู้ใช้และรหัสผ่าน',
        icon: 'error',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#d33'
      })
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
                  onChange={e => setUsername(e.target.value)}
                  className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="ระบุชื่อผู้ใช้"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">รหัสผ่าน</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full rounded border px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-green-600"
                    placeholder="ระบุรหัสผ่าน"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
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
