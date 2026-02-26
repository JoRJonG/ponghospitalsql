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
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 opacity-50 pointer-events-none">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded flex items-center justify-center border border-white/30 backdrop-blur-sm animate-pulse">
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-4 w-32 bg-white/20 rounded animate-pulse"></div>
            <div className="h-3 w-40 bg-white/20 rounded animate-pulse"></div>
          </div>
        </div>

        <div className="flex items-center gap-8 md:gap-12">
          <div className="text-center flex flex-col items-center gap-1.5">
            <div className="h-8 w-20 bg-white/20 rounded-md animate-pulse"></div>
            <div className="h-3 w-24 bg-white/20 rounded animate-pulse"></div>
          </div>
          <div className="h-8 w-px bg-teal-400/50"></div>
          <div className="text-center flex flex-col items-center gap-1.5">
            <div className="h-8 w-20 bg-white/20 rounded-md animate-pulse"></div>
            <div className="h-3 w-24 bg-white/20 rounded animate-pulse"></div>
          </div>
        </div>

        <div className="hidden md:block">
          <div className="h-3 w-32 bg-white/20 rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 opacity-70">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded flex items-center justify-center border border-white/20 text-white/50 backdrop-blur-sm">
            <i className="fa-solid fa-triangle-exclamation text-xl"></i>
          </div>
          <div>
            <h2 className="text-white/80 font-bold text-sm tracking-widest uppercase mb-0.5">Website Statistics</h2>
            <span className="flex items-center text-xs text-red-200">
              ไม่สามารถโหลดข้อมูลได้
            </span>
          </div>
        </div>
        <div className="hidden md:block text-teal-100/50 text-xs">
          Offline
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-6">

      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white/20 rounded flex items-center justify-center border border-white/30 text-white backdrop-blur-sm">
          <i className="fa-solid fa-chart-pie text-xl"></i>
        </div>
        <div>
          <h2 className="text-white font-bold text-sm tracking-widest uppercase mb-0.5">Website Statistics</h2>
          <p className="text-teal-100/90 text-xs font-medium">ข้อมูลสถิติการเข้าชมเว็บไซต์</p>
        </div>
      </div>

      <div className="flex items-center gap-8 md:gap-12">
        <div className="text-center">
          <span className="block text-3xl font-bold text-white drop-shadow-sm">{formatNumber(stats.today)}</span>
          <span className="text-xs text-teal-100 uppercase tracking-wide font-semibold">Visits Today</span>
        </div>
        <div className="h-8 w-px bg-teal-400/50"></div>
        <div className="text-center">
          <span className="block text-3xl font-bold text-white drop-shadow-sm">{formatNumber(stats.lifetimeTotal)}</span>
          <span className="text-xs text-teal-100 uppercase tracking-wide font-semibold">Total Visits</span>
        </div>
      </div>

      <div className="hidden md:block text-teal-100/80 text-xs">
        Last update: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
      </div>
    </div>
  )
}

export default VisitorCounter