import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import { useAuth } from '../../auth/AuthContext'

/**
 * ThaID Settings Component
 * ให้ผู้ใช้เปิด/ปิดการใช้งาน ThaID และเชื่อมต่อบัญชี
 */
export default function ThaIDSettings() {
    const { getToken } = useAuth()
    const [isLinked, setIsLinked] = useState(false)
    const [thaidPid, setThaidPid] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // ดึงสถานะ ThaID เมื่อ component โหลด
    useEffect(() => {
        void fetchThaidStatus()
    }, [])

    const fetchThaidStatus = async () => {
        try {
            const token = getToken()

            if (!token) {
                // อาจจะ redirect ไป login หรือแสดง error
                return
            }

            setFetching(true)
            setError(null)

            const response = await fetch('/api/auth/thaid/status', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                if (response.status === 401) {
                    // ไม่ได้ login - แสดง component แต่ไม่มีข้อมูล
                    setFetching(false)
                    return
                }
                if (response.status === 404) {
                    // API ไม่พบ - อาจยังไม่ได้ตั้งค่า
                    setError('ThaID API ยังไม่พร้อมใช้งาน')
                    setFetching(false)
                    return
                }
                throw new Error(`HTTP ${response.status}`)
            }

            const data = await response.json()
            setIsLinked(data.isLinked)
            setThaidPid(data.thaidPid)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error'
            console.error('[ThaID] Failed to fetch status:', errorMessage)
            setError(`ไม่สามารถโหลดสถานะ ThaID: ${errorMessage}`)
            // แสดง component แม้ว่า error - ให้ผู้ใช้เห็นว่ามีฟีเจอร์นี้
        } finally {
            setFetching(false)
        }
    }

    const handleLinkThaID = async () => {
        try {
            // Redirect ไป ThaID OAuth flow
            window.location.href = '/api/auth/thaid/login?link=true'
        } catch (error) {
            console.error('[ThaID] Link failed:', error)
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถเชื่อมต่อ ThaID ได้ กรุณาลองใหม่อีกครั้ง',
                icon: 'error',
                confirmButtonText: 'ตกลง',
            })
        }
    }

    const handleUnlinkThaID = async () => {
        const result = await Swal.fire({
            title: 'ยืนยันการยกเลิก',
            text: 'คุณต้องการยกเลิกการเชื่อมต่อ ThaID ใช่หรือไม่?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#d33',
        })

        if (!result.isConfirmed) return

        setLoading(true)
        try {
            const response = await fetch('/api/auth/thaid/unlink', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`,
                },
            })

            if (!response.ok) throw new Error('Unlink failed')

            await response.json()

            // อัพเดทสถานะ
            await fetchThaidStatus()

            Swal.fire({
                title: 'สำเร็จ',
                text: 'ยกเลิกการเชื่อมต่อ ThaID เรียบร้อยแล้ว',
                icon: 'success',
                confirmButtonText: 'ตกลง',
            })
        } catch (error) {
            console.error('[ThaID] Unlink failed:', error)
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถยกเลิกการเชื่อมต่อได้ กรุณาลองใหม่อีกครั้ง',
                icon: 'error',
                confirmButtonText: 'ตกลง',
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="card">
            <div className="card-header flex items-center gap-2">
                <img src="/ThaiD.webp" alt="ThaID" className="w-6 h-6 object-contain" />
                <span>การเชื่อมต่อ ThaID</span>
            </div>
            <div className="card-body">
                <div className="space-y-4">
                    {/* คำอธิบาย ThaID */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <div className="text-sm text-blue-800">
                                <p className="font-semibold mb-1">ThaID คืออะไร?</p>
                                <p className="text-blue-700">
                                    ระบบยืนยันตัวตนดิจิทัลของกรมการปกครอง ใช้บัตรประชาชนในการเข้าสู่ระบบอย่างปลอดภัย
                                    เมื่อเชื่อมต่อแล้ว คุณสามารถเข้าสู่ระบบด้วย ThaID App ได้โดยไม่ต้องใช้รหัสผ่าน
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* สถานะการเชื่อมต่อ */}
                    <div className="border rounded-lg p-4">
                        {error && (
                            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                                <strong>⚠️ คำเตือน:</strong> {error}
                            </div>
                        )}

                        {fetching ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                                <span className="ml-3 text-gray-600">กำลังโหลด...</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-800">สถานะการเชื่อมต่อ</h3>
                                    {isLinked ? (
                                        <div className="mt-2">
                                            <div className="flex items-center gap-2 text-green-600">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                <span className="font-medium">เชื่อมต่อแล้ว</span>
                                            </div>

                                        </div>
                                    ) : (
                                        <div className="mt-2">
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                                <span className="font-medium">ยังไม่ได้เชื่อมต่อ</span>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">
                                                เชื่อมต่อบัญชี ThaID เพื่อเข้าสู่ระบบได้สะดวกขึ้น
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* ปุ่มจัดการ */}
                                <div>
                                    {isLinked ? (
                                        <button
                                            onClick={handleUnlinkThaID}
                                            disabled={loading}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loading ? 'กำลังยกเลิก...' : 'ยกเลิกการเชื่อมต่อ'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleLinkThaID}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <img src="/ThaiD.webp" alt="ThaID" className="w-5 h-5 object-contain" />
                                            <span>เชื่อมต่อ ThaID</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ข้อมูลเพิ่มเติม */}
                    <div className="text-sm text-gray-600">
                        <p className="font-semibold mb-2">ข้อมูลที่ ThaID จะขอเข้าถึง:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>เลขบัตรประชาชน (PID)</li>
                        </ul>
                        <p className="mt-3 text-xs text-gray-500">
                            ข้อมูลของคุณจะถูกเก็บรักษาอย่างปลอดภัยและใช้เพื่อการยืนยันตัวตนเท่านั้น
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
