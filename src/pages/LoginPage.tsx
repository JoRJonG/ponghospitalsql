import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Swal from 'sweetalert2'
import { useAuth } from '../auth/AuthContext'
// import { useToast } from '../contexts/ToastContext'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin', { replace: true })
    }

    // ตรวจสอบ error จาก ThaID
    const error = searchParams.get('error')
    if (error === 'thaid_not_linked') {
      void Swal.fire({
        icon: 'info',
        title: 'ยังไม่ได้เชื่อมต่อ ThaID',
        html: 'คุณยังไม่ได้เชื่อมต่อ ThaID กับบัญชีของคุณ<br><br>' +
          '<strong>วิธีเชื่อมต่อ:</strong><br>' +
          '1. Login ด้วย Username/Password<br>' +
          '2. ไปที่หน้า Settings<br>' +
          '3. กดปุ่ม "เชื่อมต่อ ThaID"',
        confirmButtonText: 'เข้าใจแล้ว',
      })
    } else if (error === 'thaid_already_used') {
      void Swal.fire({
        icon: 'error',
        title: 'ThaID ถูกใช้แล้ว',
        text: 'เลขบัตรประชาชนนี้ถูกเชื่อมต่อกับบัญชีอื่นอยู่แล้ว',
        confirmButtonText: 'ตกลง',
      })
    }
  }, [isAuthenticated, navigate, searchParams])
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
            {/* ปุ่ม Login ด้วย ThaID */}
            <button
              type="button"
              onClick={() => window.location.href = '/api/auth/thaid/login'}
              className="w-full bg-white hover:bg-gray-50 border-2 border-green-600 text-green-700 font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-3 mb-4"
            >
              <img
                src="/ThaiD.webp"
                alt="ThaID"
                className="w-8 h-8 object-contain"
              />
              <span>เข้าสู่ระบบด้วย ThaID</span>
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">หรือ</span>
              </div>
            </div>

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

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">ThaID คืออะไร?</p>
                  <p className="text-blue-700">
                    ระบบยืนยันตัวตนดิจิทัลของกรมการปกครอง ใช้บัตรประชาชนในการเข้าสู่ระบบอย่างปลอดภัย
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
