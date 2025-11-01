import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { apiRequest, buildApiUrl } from '../../utils/api'
import { fastFetch } from '../../utils/fastFetch'

export type AdminIntroDashboardHandle = {
  refresh: () => Promise<void>
}

type VisitorTrend = {
  date: string
  hits: number
  uniqueVisitors: number
}

type VisitorInsights = {
  rangeDays: number
  today: {
    uniqueVisitors: number
    hits: number
    distinctIps: number
  }
  range: {
    uniqueVisitors: number
    hits: number
    distinctIps: number
  }
  lifetime: {
    uniqueVisitors: number
    hits: number
    distinctIps: number
  }
  trend: VisitorTrend[]
  topPaths: Array<{ path: string; hits: number }>
  topAgents: Array<{ userAgent: string; hits: number }>
  recentSessions: Array<{
    visitDate: string
    ipAddress: string | null
    userAgent: string | null
    path: string | null
    hits: number
    lastSeen: string
  }>
}

type DiskSnapshot = {
  mount: string
  totalBytes: number
  freeBytes: number
  usedBytes: number
  percentUsed: number
  percentFree: number
}

type SystemStatus = {
  timestamp: string
  disk: DiskSnapshot | null
  memory: DiskSnapshot | null
  cpu: {
    one: number
    five: number
    fifteen: number
  }
  meta: {
    hostname: string
    platform: string
    release: string
    arch: string
    uptimeSeconds: number
  }
}

type AdminIntroDashboardProps = {
  rangeDays?: number
}

const numberFormatter = new Intl.NumberFormat('th-TH')

function formatDate(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

function formatDay(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return date.toLocaleDateString('th-TH', {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return value
  }
}

function formatBytes(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-'
  if (value === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let idx = 0
  let output = value
  while (output >= 1024 && idx < units.length - 1) {
    output /= 1024
    idx += 1
  }
  const decimals = output < 10 && idx > 0 ? 1 : 0
  return `${output.toFixed(decimals)} ${units[idx]}`
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-'
  return `${value.toFixed(0)}%`
}

function formatDuration(seconds?: number | null) {
  if (!Number.isFinite(seconds || 0) || !seconds) return '-'
  const s = Math.max(0, Math.floor(seconds))
  const days = Math.floor(s / 86_400)
  const hours = Math.floor((s % 86_400) / 3_600)
  const minutes = Math.floor((s % 3_600) / 60)
  const parts: string[] = []
  if (days) parts.push(`${days} วัน`)
  if (hours) parts.push(`${hours} ชม.`)
  if (minutes || parts.length === 0) parts.push(`${minutes} นาที`)
  return parts.slice(0, 2).join(' ')
}

const AdminIntroDashboard = forwardRef<AdminIntroDashboardHandle, AdminIntroDashboardProps>(
  ({ rangeDays = 30 }, ref) => {
    const [insights, setInsights] = useState<VisitorInsights | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
  const [system, setSystem] = useState<SystemStatus | null>(null)

    const load = useCallback(async () => {
      setLoading(true)
      setError(null)
      try {
        const [insightsOutcome, systemOutcome] = await Promise.allSettled([
          fastFetch<{ success: boolean; data?: VisitorInsights; error?: string }>(
            buildApiUrl(`/api/visitors/insights?range=${rangeDays}`),
            { ttlMs: 2000 }
          ),
          (async () => {
            try {
              const response = await apiRequest('/api/system/status')
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
              }
              const json = await response.json().catch(() => null)
              if (json?.success && json.data) {
                return json.data as SystemStatus
              }
              throw new Error(json?.error || 'ไม่สามารถโหลดข้อมูลระบบได้')
            } catch (error) {
              console.warn('Failed to fetch system status', error)
              return null
            }
          })(),
        ])

        const insightsError = insightsOutcome.status === 'rejected'
          ? (insightsOutcome.reason instanceof Error ? insightsOutcome.reason.message : String(insightsOutcome.reason))
          : (!insightsOutcome.value?.success || !insightsOutcome.value.data)
            ? (insightsOutcome.value?.error || 'ไม่สามารถโหลดข้อมูลได้')
            : null

        if (insightsError) {
          throw new Error(insightsError)
        }

        if (insightsOutcome.status === 'fulfilled' && insightsOutcome.value?.data) {
          setInsights(insightsOutcome.value.data)
        }
        if (systemOutcome.status === 'fulfilled') {
          setSystem(systemOutcome.value)
        } else {
          setSystem(null)
        }
      } catch (err: any) {
        console.error('Failed to fetch visitor insights', err)
        setError(err?.message || 'เกิดข้อผิดพลาด')
      } finally {
        setLoading(false)
      }
    }, [rangeDays])

    useImperativeHandle(ref, () => ({ refresh: load }), [load])

    useEffect(() => {
      load()
    }, [load])

    const trendMax = useMemo(() => {
      if (!insights?.trend?.length) return 1
      return Math.max(...insights.trend.map(item => item.hits || 0), 1)
    }, [insights])

    const renderLoading = () => (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-center gap-3 text-slate-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span>กำลังโหลดข้อมูลการเข้าชม...</span>
        </div>
      </div>
    )

    const renderError = () => (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-600 shadow-sm">
        เกิดข้อผิดพลาดในการโหลดข้อมูล: {error}
      </div>
    )

    if (loading) return renderLoading()
    if (error) return renderError()
    if (!insights) return null

    const { today, range, lifetime, topPaths, topAgents, recentSessions, trend } = insights
    const disk = system?.disk || null
    const memory = system?.memory || null
    const uptimeText = formatDuration(system?.meta.uptimeSeconds)
    const loadText = system ? `${system.cpu.one.toFixed(2)} · ${system.cpu.five.toFixed(2)} · ${system.cpu.fifteen.toFixed(2)}` : '-'
    const systemStamp = system?.timestamp ? formatDate(system.timestamp) : null

    const rangeLabelDays = insights.rangeDays ?? rangeDays

    const summaryCards = [
      {
        label: 'ผู้ใช้ไม่ซ้ำวันนี้',
        value: numberFormatter.format(today.uniqueVisitors),
        detail: `IP ไม่ซ้ำ ${numberFormatter.format(today.distinctIps)}`,
        icon: '👥',
        border: 'border-emerald-100',
        background: 'bg-emerald-50/80',
        header: 'text-emerald-600',
        detailColor: 'text-emerald-600/70',
      },
      {
        label: 'จำนวนครั้งเข้าชมวันนี้',
        value: numberFormatter.format(today.hits),
        detail: 'รวมทุกการเข้าชมของวัน',
        icon: '📈',
        border: 'border-sky-100',
        background: 'bg-sky-50/80',
        header: 'text-sky-600',
        detailColor: 'text-sky-600/70',
      },
      {
        label: `ผู้ใช้ไม่ซ้ำ ${rangeLabelDays} วัน`,
        value: numberFormatter.format(range.uniqueVisitors),
        detail: `${numberFormatter.format(range.distinctIps)} IP ภายในช่วงเวลา`,
        icon: '📆',
        border: 'border-violet-100',
        background: 'bg-violet-50/80',
        header: 'text-violet-600',
        detailColor: 'text-violet-600/70',
      },
      {
        label: 'จำนวนครั้งทั้งหมด',
        value: numberFormatter.format(lifetime.hits),
        detail: `${numberFormatter.format(lifetime.uniqueVisitors)} ผู้ใช้ทั้งหมด`,
        icon: '🏁',
        border: 'border-amber-100',
        background: 'bg-amber-50/80',
        header: 'text-amber-600',
        detailColor: 'text-amber-600/70',
      },
    ]

    return (
      <div className="space-y-6 lg:space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-900 shadow-xl">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-3">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-emerald-600">Intro</span>
                  {systemStamp && (
                    <span className="text-xs text-slate-500">อัปเดตเมื่อ {systemStamp}</span>
                  )}
                </div>
                <h2 className="text-3xl font-semibold text-slate-900 lg:text-4xl">ภาพรวมสถิติหน้าเว็บไซต์หลัก</h2>
                <p className="max-w-2xl text-sm text-slate-500 lg:text-base">
                  ตัวเลขสำคัญของผู้เข้าชมเว็บไซต์แบบรายวันและสรุปย้อนหลัง {rangeDays} วัน เพื่อช่วยประเมินปริมาณการใช้งานล่าสุดอย่างชัดเจน
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {summaryCards.map(card => (
                  <div
                    key={card.label}
                    className={`relative overflow-hidden rounded-2xl border ${card.border} ${card.background} p-4 shadow-sm transition duration-200 hover:shadow-md`}
                  >
                    <div className={`text-xs font-semibold uppercase tracking-wide ${card.header}`}>{card.label}</div>
                    <div className="mt-3 flex items-baseline gap-2 text-slate-900">
                      <span className="text-3xl font-bold">{card.value}</span>
                      <span className="text-lg">{card.icon}</span>
                    </div>
                    <div className={`mt-2 text-xs ${card.detailColor}`}>{card.detail}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-100 bg-slate-50 p-6 shadow-inner">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <span className="text-emerald-500">🛠️</span>
                  สถานะเซิร์ฟเวอร์
                </h3>
                <p className="mt-1 text-xs text-slate-500">ข้อมูลจาก VPS สำหรับตรวจสอบสุขภาพระบบ</p>
              </div>
              {system ? (
                <div className="mt-4 space-y-4 text-sm text-slate-600">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-emerald-600">เครื่อง</div>
                    <div className="mt-1 text-base font-semibold text-slate-900">{system.meta.hostname}</div>
                    <div className="text-xs text-slate-500">{`${system.meta.platform} ${system.meta.release}`} · {system.meta.arch.toUpperCase()}</div>
                  </div>
                  {disk && (
                    <div className="rounded-xl bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-emerald-600">
                        <span>พื้นที่จัดเก็บ</span>
                        <span>{formatPercent(disk.percentFree)} เหลือ</span>
                      </div>
                      <div className="mt-2 text-sm text-slate-600">{formatBytes(disk.freeBytes)} จาก {formatBytes(disk.totalBytes)}</div>
                      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                          style={{ width: `${Math.min(100, Math.max(0, disk.percentUsed))}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {memory && (
                    <div className="rounded-xl bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-sky-600">
                        <span>หน่วยความจำ</span>
                        <span>{formatPercent(memory.percentFree)} เหลือ</span>
                      </div>
                      <div className="mt-2 text-sm text-slate-600">{formatBytes(memory.freeBytes)} จาก {formatBytes(memory.totalBytes)}</div>
                    </div>
                  )}
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-wide text-slate-500">
                      <span>Uptime {uptimeText}</span>
                      <span>โหลดเฉลี่ย {loadText}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-xs text-slate-500">
                  ไม่สามารถดึงข้อมูลเซิร์ฟเวอร์ได้ อาจต้องเข้าสู่ระบบใหม่
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          <article className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">ผู้ใช้ไม่ซ้ำ {rangeDays} วัน</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{numberFormatter.format(range.uniqueVisitors)}</p>
            <p className="mt-1 text-xs text-slate-500">จำแนกจาก fingerprint รายวัน</p>
          </article>
          <article className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">จำนวนครั้งรวม {rangeDays} วัน</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{numberFormatter.format(range.hits)}</p>
            <p className="mt-1 text-xs text-slate-500">รวมทุกการเข้าเว็บไซต์</p>
          </article>
          <article className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">ผู้ใช้ไม่ซ้ำทั้งหมด</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{numberFormatter.format(lifetime.uniqueVisitors)}</p>
            <p className="mt-1 text-xs text-slate-500">นับตั้งแต่เปิดระบบ</p>
          </article>
          <article className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">จำนวนครั้งทั้งหมด</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{numberFormatter.format(lifetime.hits)}</p>
            <p className="mt-1 text-xs text-slate-500">รวมทุกรายการ</p>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <span className="text-emerald-500">📈</span>
              แนวโน้มการเข้าชม {rangeDays} วันล่าสุด
            </h3>
            <div className="mt-4 space-y-3">
              {trend.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  ยังไม่มีข้อมูลในช่วงเวลานี้
                </div>
              )}
              {trend.map(item => {
                const width = Math.round(((item.hits || 0) / trendMax) * 100)
                return (
                  <div key={item.date} className="flex items-center gap-3">
                    <div className="w-20 text-xs font-medium text-slate-500">{formatDay(item.date)}</div>
                    <div className="flex-1">
                      <div className="h-3 rounded-full bg-slate-100">
                        <div
                          className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-sky-500"
                          style={{ width: `${Math.max(width, 8)}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-20 text-right text-xs text-slate-500">
                      {numberFormatter.format(item.hits)} ครั้ง
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <span className="text-amber-500">🔥</span>
              หน้าเว็บไซต์ยอดนิยม
            </h3>
            <div className="mt-4 space-y-3">
              {topPaths.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  ยังไม่มีข้อมูลการเข้าชม
                </div>
              )}
              {topPaths.map(item => (
                <div key={item.path} className="flex items-center justify-between rounded-xl bg-emerald-50/60 p-3 text-sm text-emerald-900">
                  <span className="truncate">{item.path}</span>
                  <span className="font-semibold">{numberFormatter.format(item.hits)} ครั้ง</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <span className="text-sky-500">🧠</span>
              ผู้ใช้ล่าสุด
            </h3>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="py-2 pr-4">เวลา</th>
                    <th className="py-2 pr-4">IP</th>
                    <th className="py-2 pr-4">หน้า</th>
                    <th className="py-2 pr-4">จำนวนครั้ง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {recentSessions.map((session, idx) => (
                    <tr key={`${session.lastSeen}-${idx}`}>
                      <td className="py-2 pr-4 text-xs text-slate-500">{formatDate(session.lastSeen)}</td>
                      <td className="py-2 pr-4">
                        <div className="font-medium">{session.ipAddress || 'unknown'}</div>
                        <div className="text-xs text-slate-400 truncate">{session.userAgent || 'ไม่ระบุ'}</div>
                      </td>
                      <td className="py-2 pr-4 text-xs">{session.path || '/'}</td>
                      <td className="py-2 pr-4 text-right text-xs font-semibold">
                        {numberFormatter.format(session.hits)}
                      </td>
                    </tr>
                  ))}
                  {recentSessions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-sm text-slate-500">
                        ยังไม่มีข้อมูลผู้ใช้ล่าสุด
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <span className="text-violet-500">🛰️</span>
              อุปกรณ์ยอดนิยม
            </h3>
            <div className="mt-4 space-y-3">
              {topAgents.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  ยังไม่มีข้อมูลอุปกรณ์
                </div>
              )}
              {topAgents.map(agent => (
                <div key={agent.userAgent} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="text-sm font-medium text-slate-800 truncate">{agent.userAgent}</div>
                  <div className="text-xs text-slate-500">{numberFormatter.format(agent.hits)} ครั้ง</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    )
  }
)

AdminIntroDashboard.displayName = 'AdminIntroDashboard'

export default AdminIntroDashboard
