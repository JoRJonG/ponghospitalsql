import { useCallback, useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { useAuth } from '../../auth/AuthContext'
import { buildApiUrl } from '../../utils/api'

export default function HeroSliderSettings() {
    const { getToken } = useAuth()
    const [sliderMode, setSliderMode] = useState<'show' | 'hide'>('show')
    const [modeSaving, setModeSaving] = useState(false)
    const [initialMode, setInitialMode] = useState<'show' | 'hide'>('show')

    // Fetch current setting on mount
    useEffect(() => {
        const fetchSliderMode = async () => {
            try {
                const response = await fetch(buildApiUrl('/api/system/hero-slider-mode'), {
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                })
                const result = await response.json()
                if (result?.success && result?.data?.mode) {
                    setSliderMode(result.data.mode)
                    setInitialMode(result.data.mode)
                }
            } catch (error) {
                console.error('Failed to fetch hero slider mode', error)
            }
        }
        fetchSliderMode()
    }, [getToken])

    const sliderOptions = [
        {
            value: 'show' as const,
            title: 'แสดงผล (Show)',
            description: 'แสดงแถบสไลเดอร์รูปภาพขนาดใหญ่ด้านบนสุดของหน้าแรก',
            icon: 'fa-images'
        },
        {
            value: 'hide' as const,
            title: 'ซ่อน (Hide)',
            description: 'ซ่อนแถบสไลเดอร์หลัก (โปสเตอร์ประชาสัมพันธ์จะขยับขึ้นมาแทนที่)',
            icon: 'fa-eye-slash'
        }
    ]

    const submitSliderMode = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()

        const isHide = sliderMode === 'hide'
        const confirm = await Swal.fire({
            title: isHide ? 'ยืนยันการซ่อน Slider หลัก?' : 'ยืนยันการแสดง Slider หลัก?',
            text: isHide
                ? 'สไลเดอร์ขนาดใหญ่หน้าแรกจะถูกซ่อน และโปสเตอร์จะเลื่อนขึ้นมาแทนที่ ท่านต้องการยืนยันหรือไม่?'
                : 'สไลเดอร์ขนาดใหญ่จะกลับมาแสดงผลที่ด้านบนสุดของหน้าแรกตามปกติ ท่านต้องการยืนยันหรือไม่?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: isHide ? '#d33' : '#10b981',
            cancelButtonColor: '#3085d6'
        })

        if (!confirm.isConfirmed) return

        setModeSaving(true)
        try {
            const response = await fetch(buildApiUrl('/api/system/hero-slider-mode'), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ mode: sliderMode })
            })
            const result = await response.json().catch(() => null)
            if (!response.ok || !result?.success) {
                const message = result?.error || 'ไม่สามารถบันทึกสถานะได้'
                throw new Error(message)
            }

            setInitialMode(sliderMode) // Update initial mode on success

            Swal.fire({
                title: 'สำเร็จ',
                text: 'บันทึกสถานะ Hero Slider สำเร็จ',
                icon: 'success',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#10b981'
            })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'ไม่สามารถบันทึกได้'
            console.error('Failed to update hero slider mode', error)
            Swal.fire({
                title: 'ข้อผิดพลาด',
                text: message,
                icon: 'error',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#d33'
            })
        } finally {
            setModeSaving(false)
        }
    }, [sliderMode, getToken])

    const resetSliderMode = useCallback(() => {
        setSliderMode(initialMode)
    }, [initialMode])

    return (
        <div className="card">
            <div className="card-body space-y-4">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <i className="fa-solid fa-panorama text-blue-600" />
                        แถบสไลเดอร์หน้าแรก (Hero Slider)
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">ตั้งค่าการแสดงผลแถบรูปภาพสไลด์ขนาดใหญ่ด้านบนสุดของหน้าแรก</p>
                </div>
                <form onSubmit={submitSliderMode} className="space-y-4">
                    <div className="space-y-3">
                        {sliderOptions.map(option => (
                            <label
                                key={option.value}
                                className={`flex items-start gap-3 rounded-lg border p-3 transition cursor-pointer ${sliderMode === option.value ? 'border-blue-400 bg-blue-50/40' : 'border-gray-200 hover:border-blue-200'}`}
                            >
                                <input
                                    type="radio"
                                    name="sliderMode"
                                    value={option.value}
                                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                                    checked={sliderMode === option.value}
                                    onChange={() => setSliderMode(option.value)}
                                    disabled={modeSaving}
                                />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <i className={`fa-solid ${option.icon} text-blue-600`} />
                                        <span className="font-medium text-gray-900">{option.title}</span>
                                    </div>
                                    <p className="mt-1 text-sm text-gray-600">{option.description}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="submit" className="admin-btn" disabled={modeSaving}>
                            {modeSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                        </button>
                        <button
                            type="button"
                            className="admin-btn admin-btn--outline"
                            disabled={modeSaving || sliderMode === initialMode}
                            onClick={resetSliderMode}
                        >
                            รีเซ็ต
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
