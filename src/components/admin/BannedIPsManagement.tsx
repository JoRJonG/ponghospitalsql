import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { apiRequest } from '../../utils/api'
import Swal from 'sweetalert2'

type BannedIp = {
    ip: string
    unblockTime: number
    reason?: string
}

export interface BannedIPsManagementHandle {
    refresh: () => Promise<void>
}

function formatDate(iso: string) {
    if (!iso) return '-'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

const BannedIPsManagement = forwardRef<BannedIPsManagementHandle>((_, ref) => {
    const [bannedIps, setBannedIps] = useState<BannedIp[]>([])
    const [loading, setLoading] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [searchTerm, setSearchTerm] = useState('')
    const itemsPerPage = 10

    const loadBannedIps = useCallback(async () => {
        setLoading(true)
        try {
            const response = await apiRequest('/api/system/banned-ips')
            if (response.ok) {
                const json = await response.json()
                if (json.success) {
                    setBannedIps(json.data || [])
                }
            }
        } catch (e) {
            console.error('Failed to load banned IPs', e)
            Swal.fire('Error', 'ไม่สามารถโหลดข้อมูลได้', 'error')
        } finally {
            setLoading(false)
        }
    }, [])

    useImperativeHandle(ref, () => ({
        refresh: loadBannedIps
    }))

    useEffect(() => {
        loadBannedIps()
    }, [loadBannedIps])

    // Filter Logic
    const filteredIps = bannedIps.filter(item =>
        item.ip.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Reset page when search changes
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-3xl">🚫</span>
                    จัดการ IP ที่ถูกแบน
                </h2>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-400">🔍</span>
                        </div>
                        <input
                            type="text"
                            placeholder="ค้นหา IP..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:border-red-400 focus:ring-4 focus:ring-red-50 transition-all duration-200 outline-none"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <button
                        onClick={async () => {
                            const { value: ip } = await Swal.fire({
                                title: 'แบน IP ด้วยตนเอง',
                                input: 'text',
                                inputLabel: 'ระบุ IP Address ที่ต้องการแบน (ถาวร)',
                                inputPlaceholder: 'เช่น 192.168.1.1',
                                showCancelButton: true,
                                confirmButtonText: 'แบนเลย',
                                cancelButtonText: 'ยกเลิก',
                                inputValidator: (value) => {
                                    if (!value) {
                                        return 'กรุณาระบุ IP Address'
                                    }
                                    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
                                    if (!ipRegex.test(value)) {
                                        return 'รูปแบบ IP ไม่ถูกต้อง'
                                    }
                                }
                            })

                            if (ip) {
                                try {
                                    const res = await apiRequest('/api/system/banned-ips', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ ip })
                                    })
                                    const json = await res.json()
                                    if (res.ok && json.success) {
                                        Swal.fire('สำเร็จ', `แบน IP ${ip} เรียบร้อย`, 'success')
                                        loadBannedIps()
                                    } else {
                                        Swal.fire('Error', json.error || 'เกิดข้อผิดพลาด', 'error')
                                    }
                                } catch (e) {
                                    console.error(e)
                                    Swal.fire('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error')
                                }
                            }
                        }}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                        <span className="text-lg">+</span> แบน IP
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-500">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 mb-2"></div>
                        <p>กำลังโหลดข้อมูล...</p>
                    </div>
                ) : filteredIps.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">
                            {searchTerm ? '🔍' : '🛡️'}
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">
                            {searchTerm ? 'ไม่พบ IP ที่ค้นหา' : 'ไม่พบ IP ที่ถูกแบน'}
                        </h3>
                        <p className="text-slate-500 mt-1">
                            {searchTerm ? `ไม่พบรายการที่ตรงกับ "${searchTerm}"` : 'ระบบปลอดภัยดีเยี่ยม ยังไม่มีผู้บุกรุกที่ถูกแบนถาวร'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">IP Address</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">เวลาปลดล็อก (Unlock Time)</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">สถานะ</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {filteredIps
                                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                        .map((item, idx) => (
                                            <tr key={`${item.ip}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-2 w-2 rounded-full bg-red-500"></div>
                                                        <span className="font-mono text-sm font-medium text-slate-900 highlight-text">{item.ip}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                    {item.unblockTime ? formatDate(new Date(item.unblockTime).toISOString()) : <span className="text-red-600 font-bold">ถาวร (Permanent)</span>}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                                                        Banned
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button
                                                        onClick={async () => {
                                                            const result = await Swal.fire({
                                                                title: 'ปลดแบน IP?',
                                                                text: `ยืนยันการลบ ${item.ip} ออกจากรายการแบน`,
                                                                icon: 'warning',
                                                                showCancelButton: true,
                                                                confirmButtonColor: '#3085d6',
                                                                cancelButtonColor: '#d33',
                                                                confirmButtonText: 'ใช่, ปลดแบน',
                                                                cancelButtonText: 'ยกเลิก'
                                                            })
                                                            if (result.isConfirmed) {
                                                                try {
                                                                    const res = await apiRequest(`/api/system/banned-ips/${item.ip}`, { method: 'DELETE' })
                                                                    if (res.ok) {
                                                                        Swal.fire('สำเร็จ', 'ปลดแบนเรียบร้อย', 'success')
                                                                        loadBannedIps()
                                                                    } else {
                                                                        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถปลดแบนได้', 'error')
                                                                    }
                                                                } catch (e) { console.error(e) }
                                                            }
                                                        }}
                                                        className="text-red-600 hover:text-red-900 text-sm font-medium hover:underline"
                                                    >
                                                        ปลดแบน
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
                            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-slate-700">
                                        แสดง <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> ถึง <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredIps.length)}</span> จากทั้งหมด <span className="font-medium">{filteredIps.length}</span> รายการ
                                    </p>
                                </div>
                                <div>
                                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <span className="sr-only">Previous</span>
                                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                        <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 focus:outline-offset-0">
                                            หน้า {currentPage} / {Math.ceil(filteredIps.length / itemsPerPage) || 1}
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredIps.length / itemsPerPage), p + 1))}
                                            disabled={currentPage >= Math.ceil(filteredIps.length / itemsPerPage)}
                                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <span className="sr-only">Next</span>
                                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="rounded-xl bg-blue-50 p-4 border border-blue-100 text-sm text-blue-700">
                <div className="flex items-start gap-2">
                    <span className="text-lg">ℹ️</span>
                    <div>
                        <p className="font-semibold">เกี่ยวกับระบบแบนอัตโนมัติ</p>
                        <p className="mt-1 opacity-90">
                            IP ที่พยายามสแกนหาไฟล์อันตราย (เช่น .git, .env) จะถูกแบนเป็นเวลา 24 ชั่วโมงโดยอัตโนมัติ<br />
                            ท่านสามารถกดปุ่ม "ปลดแบน" ในตารางด้านบนเพื่อลบ IP ออกจากรายชื่อได้ทันที
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
})

export default BannedIPsManagement
