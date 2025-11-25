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
    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
      
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-emerald-900/50 rounded flex items-center justify-center border border-emerald-800 text-emerald-500">
          <i className="fa-solid fa-chart-pie text-xl"></i>
        </div>
        <div>
          <h4 className="text-white font-semibold text-sm tracking-widest uppercase">Website Statistics</h4>
          <p className="text-slate-400 text-xs">ข้อมูลสถิติการเข้าชมเว็บไซต์</p>
        </div>
      </div>

      <div className="flex items-center gap-12">
        <div className="text-center">
          <span className="block text-3xl font-bold text-emerald-400">{formatNumber(stats.today)}</span>
          <span className="text-xs text-slate-500 uppercase tracking-wide">Visits Today</span>
        </div>
        <div className="h-8 w-px bg-slate-700"></div>
        <div className="text-center">
          <span className="block text-3xl font-bold text-white">{formatNumber(stats.lifetimeTotal)}</span>
          <span className="text-xs text-slate-500 uppercase tracking-wide">Total Visits</span>
        </div>
      </div>
      
      <div className="hidden md:block text-slate-600 text-xs">
        Last update: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
      </div>
    </div>
  )
}

export default VisitorCounter