import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { apiRequest, buildApiUrl } from '../../utils/api'
import { fastFetch } from '../../utils/fastFetch'

export type AdminIntroDashboardHandle = {
  refresh: () => Promise<void>
}

type VisitorTrend = {
  date: string
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
const relativeTimeFormatter = new Intl.RelativeTimeFormat('th-TH', { numeric: 'auto' })

const BOT_KEYWORDS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scanner/i,
  /scanalert/i,
  /masscan/i,
  /sqlmap/i,
  /uptime/i,
  /monitor/i,
  /headlesschrome/i,
  /phantomjs/i,
  /selenium/i,
  /python-requests/i,
  /curl/i,
  /wget/i,
  /httpclient/i,
  /libwww-perl/i,
  /okhttp/i,
  /go-http-client/i,
  /axios/i,
  /ai scanner/i,
  /expanse/i,
  /cortex/i,
  /palo\s*alto/i,
  /hello\s*world/i,
]

const RECENT_PAGE_SIZE = 10
const AGENT_PAGE_SIZE = 20

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



function summarizeUserAgent(agent?: string | null) {
  const raw = (agent || '').trim()
  if (!raw) {
    return { label: 'ไม่ระบุ', detail: null as string | null, isBot: false }
  }

  if (BOT_KEYWORDS.some(pattern => pattern.test(raw))) {
    return { label: 'Bot / Scanner', detail: raw, isBot: true }
  }

  const isMobile = /Mobile|Android|iPhone|iPad/i.test(raw)
  const isWindows = /Windows NT/i.test(raw)
  const isMac = /Mac OS X/i.test(raw)
  const isLinux = /Linux/i.test(raw) && !isAndroid(raw)

  const browser = detectBrowser(raw)
  const platform = isMobile
    ? detectMobilePlatform(raw)
    : isWindows
      ? 'Windows'
      : isMac
        ? 'macOS'
        : isLinux
          ? 'Linux'
          : null

  const labelParts = [browser, platform].filter(Boolean)
  const label = labelParts.length ? labelParts.join(' · ') : truncate(raw, 60)

  return {
    label,
    detail: label === raw ? null : raw,
    isBot: false,
  }
}

function detectBrowser(value: string) {
  if (/Edg\//i.test(value)) return 'Edge'
  if (/Firefox\//i.test(value)) return 'Firefox'
  if (/OPR\//i.test(value) || /Opera/i.test(value)) return 'Opera'
  if (/Chrome\//i.test(value) && !/Chromium/i.test(value)) return 'Chrome'
  if (/Safari\//i.test(value) && /Version\//i.test(value)) return 'Safari'
  if (/Chromium/i.test(value)) return 'Chromium'
  return null
}

function detectMobilePlatform(value: string) {
  if (/iPad|iPhone|iPod/i.test(value)) return 'iOS'
  if (/Android/i.test(value)) return 'Android'
  return 'Mobile'
}

function isAndroid(value: string) {
  return /Android/i.test(value)
}

function truncate(value: string, max = 80) {
  if (value.length <= max) return value
  return `${value.slice(0, max - 3)}...`
}

function formatRelative(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = date.getTime() - Date.now()
  const abs = Math.abs(diffMs)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (abs < hour) {
    const minutes = Math.round(diffMs / minute)
    return relativeTimeFormatter.format(minutes, 'minute')
  }
  if (abs < day) {
    const hours = Math.round(diffMs / hour)
    return relativeTimeFormatter.format(hours, 'hour')
  }
  const days = Math.round(diffMs / day)
  return relativeTimeFormatter.format(days, 'day')
}

const AdminIntroDashboard = forwardRef<AdminIntroDashboardHandle, AdminIntroDashboardProps>(
  ({ rangeDays = 30 }, ref) => {
    const [insights, setInsights] = useState<VisitorInsights | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [system, setSystem] = useState<SystemStatus | null>(null)
    const [recentPage, setRecentPage] = useState(1)
    const [agentPage, setAgentPage] = useState(1)
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
      } catch (thrown: unknown) {
        console.error('Failed to fetch visitor insights', thrown)
        if (thrown instanceof Error) {
          setError(thrown.message || 'เกิดข้อผิดพลาด')
        } else {
          setError('เกิดข้อผิดพลาด')
        }
      } finally {
        setLoading(false)
      }
    }, [rangeDays])

    useImperativeHandle(ref, () => ({ refresh: load }), [load])

    useEffect(() => {
      load()
    }, [load])

    const filteredRecentSessions = useMemo(() => {
      const sessions = insights?.recentSessions ?? []
      return sessions.filter(session => !summarizeUserAgent(session.userAgent).isBot)
    }, [insights])

    const filteredTopAgents = useMemo(() => {
      const agents = insights?.topAgents ?? []
      return agents.filter(agent => !summarizeUserAgent(agent.userAgent).isBot)
    }, [insights])

    const recentLength = filteredRecentSessions.length
    const agentLength = filteredTopAgents.length

    useEffect(() => {
      const maxPages = recentLength ? Math.ceil(recentLength / RECENT_PAGE_SIZE) : 1
      setRecentPage(prev => Math.min(Math.max(prev, 1), maxPages))
    }, [recentLength])

    useEffect(() => {
      const maxPages = agentLength ? Math.ceil(agentLength / AGENT_PAGE_SIZE) : 1
      setAgentPage(prev => Math.min(Math.max(prev, 1), maxPages))
    }, [agentLength])

    const paginatedRecentSessions = useMemo(() => {
      if (!filteredRecentSessions.length) return []
      const start = (recentPage - 1) * RECENT_PAGE_SIZE
      return filteredRecentSessions.slice(start, start + RECENT_PAGE_SIZE)
    }, [filteredRecentSessions, recentPage])

    const paginatedTopAgents = useMemo(() => {
      if (!filteredTopAgents.length) return []
      const start = (agentPage - 1) * AGENT_PAGE_SIZE
      return filteredTopAgents.slice(start, start + AGENT_PAGE_SIZE)
    }, [filteredTopAgents, agentPage])

    const trendMax = useMemo(() => {
      if (!insights?.trend?.length) return 1
      return Math.max(...insights.trend.map(item => item.uniqueVisitors || 0), 1)
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

    const { today, range, lifetime, trend } = insights
    const disk = system?.disk || null
    const systemStamp = system?.timestamp ? formatDate(system.timestamp) : null

    const rangeLabelDays = insights.rangeDays ?? rangeDays
    const recentTotalPages = recentLength ? Math.ceil(recentLength / RECENT_PAGE_SIZE) : 1
    const agentTotalPages = agentLength ? Math.ceil(agentLength / AGENT_PAGE_SIZE) : 1

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

            {/* Storage Status (Disk Only) - Visible to all admins */}
            <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-100 bg-slate-50 p-6 shadow-inner">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <span className="text-emerald-500">💾</span>
                  พื้นที่จัดเก็บ
                </h3>
                <p className="mt-1 text-xs text-slate-500">ข้อมูลการใช้งานพื้นที่บนเซิร์ฟเวอร์</p>
              </div>
              {system ? (
                <div className="mt-4 space-y-4 text-sm text-slate-600">
                  {disk ? (
                    <div className="rounded-xl bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-emerald-600">
                        <span>Storage</span>
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
                  ) : (
                    <div className="text-center text-xs text-slate-400 py-4">ไม่พบข้อมูลดิสก์</div>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-xs text-slate-500">
                  ไม่สามารถดึงข้อมูลเซิร์ฟเวอร์ได้
                </div>
              )}
            </div>
          </div>
        </section >

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
            <p className="mt-1 text-xs text-slate-500">90 วันล่าสุด</p>
          </article>
          <article className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">จำนวนครั้งทั้งหมด</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{numberFormatter.format(lifetime.hits)}</p>
            <p className="mt-1 text-xs text-slate-500">รวมทุกรายการ</p>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <span className="text-emerald-500">📈</span>
              แนวโน้มผู้เข้าชมไม่ซ้ำ {rangeDays} วันล่าสุด
            </h3>
            <div className="mt-4 space-y-3">
              {trend.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  ยังไม่มีข้อมูลในช่วงเวลานี้
                </div>
              )}
              {[...trend].reverse().map(item => {
                const width = Math.round(((item.uniqueVisitors || 0) / trendMax) * 100)
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
                      {numberFormatter.format(item.uniqueVisitors)} คน
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </section>

        <section className="grid gap-4 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span className="text-sky-500">🧠</span>
                ผู้ใช้ล่าสุด
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  {recentLength ? `ทั้งหมด ${recentLength} รายการ` : 'ยังไม่มีข้อมูล'}
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {paginatedRecentSessions.map((session, idx) => {
                const agentInfo = summarizeUserAgent(session.userAgent)
                const ipLabel = session.ipAddress || 'unknown'
                const relative = formatRelative(session.lastSeen)
                const displayIndex = (recentPage - 1) * RECENT_PAGE_SIZE + idx + 1
                return (
                  <div
                    key={`${session.lastSeen}-${idx}`}
                    className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-100 hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sm font-semibold text-sky-600">
                          {displayIndex}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-900/90 px-2 py-1 text-xs font-semibold tracking-wide text-white">
                              {ipLabel}
                            </span>
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${agentInfo.isBot ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {agentInfo.label}
                            </span>
                          </div>
                          {/* Removed raw user agent detail per request */}
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <div className="font-semibold text-slate-700">{formatDate(session.lastSeen)}</div>
                        {relative && <div className="mt-1 text-[11px] text-slate-400">{relative}</div>}
                        <div className="mt-2 text-[11px] font-semibold text-slate-600">
                          จำนวนครั้ง: {numberFormatter.format(session.hits)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              {recentLength === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  ยังไม่มีข้อมูลผู้ใช้ล่าสุด
                </div>
              )}
            </div>
            {recentLength > 0 && (
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3 text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => setRecentPage(page => Math.max(1, page - 1))}
                  className="rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-600 transition hover:border-sky-200 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={recentPage === 1}
                >
                  ก่อนหน้า
                </button>
                <span>หน้า {recentPage} / {recentTotalPages}</span>
                <button
                  type="button"
                  onClick={() => setRecentPage(page => Math.min(recentTotalPages, page + 1))}
                  className="rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-600 transition hover:border-sky-200 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={recentPage === recentTotalPages}
                >
                  ถัดไป
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span className="text-violet-500">🛰️</span>
                อุปกรณ์ยอดนิยม
              </h3>
              {agentLength > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {`${agentLength} รายการ`}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-4 space-y-3">
              {agentLength === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  ยังไม่มีข้อมูลอุปกรณ์
                </div>
              )}
              {paginatedTopAgents.map((agent, idx) => {
                const agentInfo = summarizeUserAgent(agent.userAgent)
                return (
                  <div key={`${agent.userAgent || 'unknown'}-${agentPage}-${idx}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-medium text-slate-800">{agentInfo.label}</div>
                      <div className="rounded-full bg-violet-100 px-2 py-[2px] text-[11px] font-semibold text-violet-700">
                        {numberFormatter.format(agent.hits)} ครั้ง
                      </div>
                    </div>
                    {/* Removed raw user agent detail per request */}
                  </div>
                )
              })}
            </div>
            {agentLength > 0 && (
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3 text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => setAgentPage(page => Math.max(1, page - 1))}
                  className="rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-600 transition hover:border-sky-200 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={agentPage === 1}
                >
                  ก่อนหน้า
                </button>
                <span>หน้า {agentPage} / {agentTotalPages}</span>
                <button
                  type="button"
                  onClick={() => setAgentPage(page => Math.min(agentTotalPages, page + 1))}
                  className="rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-600 transition hover:border-sky-200 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={agentPage === agentTotalPages}
                >
                  ถัดไป
                </button>
              </div>
            )}
          </div>
        </section>
      </div >
    )
  }
)

AdminIntroDashboard.displayName = 'AdminIntroDashboard'

export default AdminIntroDashboard
