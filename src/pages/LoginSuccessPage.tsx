import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * หน้ารับ token หลังจาก ThaID callback สำเร็จ
 * รับ token จาก query parameter แล้ว redirect ไป dashboard
 */
export default function LoginSuccessPage() {
    const navigate = useNavigate()

    useEffect(() => {
        const checkSession = async () => {
            try {
                const r = await fetch('/api/auth/me', { credentials: 'include' })
                if (r.ok) {
                    const data = await r.json()
                    if (data.user) {
                        localStorage.setItem('ph_admin_user', JSON.stringify(data.user))
                        setTimeout(() => {
                            window.location.replace('/admin')
                        }, 1000)
                    } else {
                        navigate('/login?error=no_user', { replace: true })
                    }
                } else {
                    navigate('/login?error=auth_failed', { replace: true })
                }
            } catch (error) {
                console.error('[ThaID] Session fetch failed:', error)
                navigate('/login?error=invalid_session', { replace: true })
            }
        }

        checkSession()
    }, [navigate])

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
