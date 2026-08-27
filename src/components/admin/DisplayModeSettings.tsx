import { useCallback, useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { useAuth } from '../../auth/AuthContext'
import { useTheme, type GrayscaleMode } from '../../contexts/ThemeContext'
import { buildApiUrl } from '../../utils/api'

export default function DisplayModeSettings() {
    const { getToken } = useAuth()
    const { grayscaleMode, refreshDisplayMode } = useTheme()
    const [displayMode, setDisplayMode] = useState<GrayscaleMode>(grayscaleMode)
    const [modeSaving, setModeSaving] = useState(false)

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

    const submitDisplayMode = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()

        const isGrayscale = displayMode === 'force-on'
        const confirm = await Swal.fire({
            title: isGrayscale ? 'ยืนยันการเปิดโหมดขาวดำ?' : 'ยืนยันการเปิดโหมดสีปกติ?',
            text: isGrayscale
                ? 'เว็บไซต์ทั้งหมดจะแสดงผลเป็นโทนสีขาวดำสำหรับผู้เข้าชมทุกคน ท่านต้องการยืนยันหรือไม่?'
                : 'เว็บไซต์จะกลับมาแสดงผลด้วยสีปกติตามเดิม ท่านต้องการยืนยันหรือไม่?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: isGrayscale ? '#d33' : '#10b981', // Red for grayscale (warning), Green for normal
            cancelButtonColor: '#3085d6'
        })

        if (!confirm.isConfirmed) return

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
            Swal.fire({
                title: 'สำเร็จ',
                text: 'บันทึกโหมดการแสดงผลสำเร็จ',
                icon: 'success',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#006241'
            })
            if (result?.data?.mode) {
                setDisplayMode(result.data.mode as GrayscaleMode)
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'ไม่สามารถบันทึกโหมดการแสดงผลได้'
            console.error('Failed to update display mode', error)
            Swal.fire({
                title: 'ข้อผิดพลาด',
                text: message,
                icon: 'error',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#dc2626'
            })
        } finally {
            setModeSaving(false)
        }
    }, [displayMode, getToken, refreshDisplayMode])

    const resetDisplayMode = useCallback(() => {
        setDisplayMode(grayscaleMode)
    }, [grayscaleMode])

    return (
        <div className="card">
            <div className="card-body space-y-4">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <i className="fa-solid fa-circle-half-stroke text-emerald-600" />
                        การแสดงผลเว็บไซต์
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">เลือกรูปแบบสีที่ต้องการแสดงให้ผู้เข้าชมเห็นบนทุกหน้า</p>
                </div>
                <form onSubmit={submitDisplayMode} className="space-y-4">
                    <div className="space-y-3">
                        {displayModeOptions.map(option => (
                            <label
                                key={option.value}
                                className={`flex items-start gap-3 rounded-lg border p-3 transition cursor-pointer ${displayMode === option.value ? 'border-emerald-400 bg-emerald-50/40' : 'border-gray-200 hover:border-emerald-200'}`}
                            >
                                <input
                                    type="radio"
                                    name="displayMode"
                                    value={option.value}
                                    className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                                    checked={displayMode === option.value}
                                    onChange={() => { setDisplayMode(option.value); }}
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
                        <button type="submit" className="admin-btn admin-btn--add" disabled={modeSaving}>
                            {modeSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                        </button>
                        <button
                            type="button"
                            className="admin-btn admin-btn--outline"
                            disabled={modeSaving || displayMode === grayscaleMode}
                            onClick={resetDisplayMode}
                        >
                            รีเซ็ต
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}