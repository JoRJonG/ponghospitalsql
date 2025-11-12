import React, { useState, useEffect } from 'react'
import { buildApiUrl } from '../utils/api'
import { fastFetch } from '../utils/fastFetch'

interface VisitorStats {
  today: number
  lifetimeTotal: number
}

type VisitorStatsResponse = {
  success: boolean
  data?: {
  today?: number | string | null
  todayUnique?: number | string | null
  todayPageViews?: number | string | null
    lifetimeTotal?: number | string | null
    total?: number | string | null
  }
}

const VisitorCounter: React.FC = () => {
  const [stats, setStats] = useState<VisitorStats>({
    today: 0,
    lifetimeTotal: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchVisitorStats = async () => {
      try {
        const response = await fastFetch<VisitorStatsResponse>(buildApiUrl('/api/visitors/stats'))
        if (response.success) {
          const payload = response.data ?? {}
          const today = Number(payload.todayUnique ?? payload.today) || 0
          setStats({
            today,
            lifetimeTotal: Number(payload.lifetimeTotal ?? payload.total) || 0,
          })
        } else {
          setError('Failed to load visitor statistics')
        }
      } catch (err) {
        console.error('Error fetching visitor stats:', err)
        setError('Unable to load visitor statistics')
      } finally {
        setLoading(false)
      }
    }

    fetchVisitorStats()
  }, [])

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('th-TH').format(num)
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-gray-600">
        <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
        <span>กำลังโหลด...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-gray-500">
        <span className="flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          ไม่สามารถโหลดข้อมูลได้
        </span>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-lg">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-400" />

      <div className="relative flex flex-col gap-6 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-inner">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0z M5.5 19.5C5.5 16.462 8.186 14 11.5 14h1c3.314 0 6 2.462 6 5.5 0 .276-.224.5-.5.5h-12c-.276 0-.5-.224-.5-.5z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-600/80">Website Insight</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">สถิติผู้เข้าชมเว็บไซต์</h3>
            <p className="mt-1 text-sm text-slate-500">ข้อมูลอัปเดตอัตโนมัติจากระบบติดตามผู้เข้าชม</p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-end sm:gap-10">
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">ผู้เข้าชมวันนี้ (ไม่ซ้ำ)</span>
            <span className="text-3xl font-bold text-slate-900 sm:text-4xl">{formatNumber(stats.today)}</span>
            <span className="text-[11px] uppercase tracking-widest text-slate-400">นับเฉพาะผู้ที่เปิดหน้าเว็บไซต์ใหม่หลังปิดเบราว์เซอร์</span>
          </div>
          <div className="hidden h-14 w-px rounded-full bg-gradient-to-b from-emerald-200 via-slate-200 to-teal-200 sm:block" />
          <div className="flex flex-1 flex-col gap-1 text-left sm:text-right">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">ยอดสะสมทั้งหมด</span>
            <span className="text-3xl font-bold text-slate-900 sm:text-4xl">{formatNumber(stats.lifetimeTotal)}</span>
            <span className="text-[11px] uppercase tracking-widest text-slate-400">ตั้งแต่เริ่มเก็บข้อมูล (ผู้เข้าชมไม่ซ้ำ)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VisitorCounter