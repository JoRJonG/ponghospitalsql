import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

/**
 * หน้ารับ token หลังจาก ThaID callback สำเร็จ
 * รับ token จาก query parameter แล้ว redirect ไป dashboard
 */
export default function LoginSuccessPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()

    useEffect(() => {
        const token = searchParams.get('token')

        if (token) {
            try {
                // เก็บ token ใน localStorage
                localStorage.setItem('ph_admin_token', token)

                // Decode JWT เพื่อดึงข้อมูล user (ไม่ต้อง verify signature เพราะมาจาก backend ของเราเอง)
                const payload = JSON.parse(atob(token.split('.')[1]))

                if (payload.username) {
                    const user = {
                        username: payload.username,
                        roles: payload.roles || [],
                        permissions: payload.permissions || []
                    }
                    localStorage.setItem('ph_admin_user', JSON.stringify(user))
                }

                // Set session cookie
                document.cookie = 'ph_admin_session_active=true; path=/'

                // Redirect ไปหน้า Dashboard หลังจาก 1 วินาที
                setTimeout(() => {
                    // Force reload to update AuthContext state from localStorage
                    window.location.replace('/admin')
                }, 1000)
            } catch (error) {
                console.error('[ThaID] Token parsing failed:', error)
                navigate('/login?error=invalid_token', { replace: true })
            }
        } else {
            // ถ้าไม่มี token ให้กลับไปหน้า login
            navigate('/login?error=no_token', { replace: true })
        }
    }, [searchParams, navigate])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
            <div className="text-center">
                {/* Loading Spinner */}
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>

                {/* Loading Text */}
                <p className="text-xl font-semibold text-gray-700 mb-2">กำลังเข้าสู่ระบบ...</p>
                <p className="text-sm text-gray-500">กรุณารอสักครู่</p>

                {/* Success Icon (แสดงหลัง token ถูกเก็บ) */}
                <div className="mt-6">
                    <svg className="w-12 h-12 text-green-600 mx-auto animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>
        </div>
    )
}
