import React, { useState, useEffect } from 'react'
import { buildApiUrl } from '../utils/api'
import { fastFetch } from '../utils/fastFetch'

interface VisitorStats {
  today: number
  lifetimeTotal: number
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
        const response = await fastFetch(buildApiUrl('/api/visitors/stats'))
        if (response.success) {
          const payload = response.data ?? {}
          setStats({
            today: Number(payload.today) || 0,
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
    <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg p-4 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">สถิติผู้เข้าชมเว็บไซต์</h3>
            <div className="flex items-baseline flex-wrap gap-x-4 gap-y-1 mt-1">
              <div className="text-sm text-gray-500">
                วันนี้ {formatNumber(stats.today)}
              </div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 uppercase tracking-wide">ยอดสะสมทั้งหมด</div>
          <div className="text-lg font-semibold text-gray-900 mt-1">
            {formatNumber(stats.lifetimeTotal)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VisitorCounter