import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { buildApiUrl } from '../../utils/api'
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
    const [recentPage, setRecentPage] = useState(1)
    const [agentPage, setAgentPage] = useState(1)
    const load = useCallback(async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fastFetch<{ success: boolean; data?: VisitorInsights; error?: string }>(
          buildApiUrl(`/api/visitors/insights?range=${rangeDays}`),
          { ttlMs: 2000 }
        )

        if (!response?.success || !response.data) {
          throw new Error(response?.error || 'ไม่สามารถโหลดข้อมูลได้')
        }

        setInsights(response.data)
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

    const rangeLabelDays = insights.rangeDays ?? rangeDays
    const recentTotalPages = recentLength ? Math.ceil(recentLength / RECENT_PAGE_SIZE) : 1
    const agentTotalPages = agentLength ? Math.ceil(agentLength / AGENT_PAGE_SIZE) : 1

    const summaryCards = [
      {
        label: 'ผู้ใช้ไม่ซ้ำวันนี้',
        value: numberFormatter.format(today.uniqueVisitors),
        detail: `IP ไม่ซ้ำ ${numberFormatter.format(today.distinctIps)}`,
        icon: <i className="fa-solid fa-users"></i>,
        colors: { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', hover: 'hover:border-emerald-300' }
      },
      {
        label: 'จำนวนครั้งเข้าชมวันนี้',
        value: numberFormatter.format(today.hits),
        detail: 'รวมทุกการเข้าชมของวัน',
        icon: <i className="fa-solid fa-arrow-trend-up"></i>,
        colors: { text: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100', hover: 'hover:border-sky-300' }
      },
      {
        label: `ผู้ใช้ไม่ซ้ำ ${rangeLabelDays} วัน`,
        value: numberFormatter.format(range.uniqueVisitors),
        detail: `${numberFormatter.format(range.distinctIps)} IP ภายในช่วงเวลา`,
        icon: <i className="fa-solid fa-calendar-days"></i>,
        colors: { text: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', hover: 'hover:border-violet-300' }
      },
      {
        label: 'จำนวนครั้งทั้งหมด',
        value: numberFormatter.format(lifetime.hits),
        detail: `${numberFormatter.format(lifetime.uniqueVisitors)} ผู้ใช้ทั้งหมด`,
        icon: <i className="fa-solid fa-flag-checkered"></i>,
        colors: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', hover: 'hover:border-amber-300' }
      },
    ]

    return (
      <div className="space-y-6 lg:space-y-8">
        
        {/* === SECTION 1: ภาพรวมสถิติ (Overview Cards) === */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 text-slate-900 shadow-sm">
          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2">
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-600 border border-emerald-100">Overview</span>
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 md:text-3xl">ภาพรวมสถิติหน้าเว็บไซต์หลัก</h2>
              <p className="max-w-2xl text-sm text-slate-500">
                ตัวเลขสำคัญของผู้เข้าชมเว็บไซต์แบบรายวันและสรุปย้อนหลัง {rangeDays} วัน
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {summaryCards.map(card => (
                <div
                  key={card.label}
                  className={`relative overflow-hidden rounded-2xl border ${card.colors.border} bg-white p-5 shadow-sm ${card.colors.hover} hover:shadow-md transition duration-200 group`}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</div>
                  <div className="mt-3 flex items-center justify-between text-slate-900">
                    <span className="text-3xl font-bold">{card.value}</span>
                    <span className={`text-2xl ${card.colors.bg} ${card.colors.text} p-3 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110`}>{card.icon}</span>
                  </div>
                  <div className={`mt-4 text-xs font-medium ${card.colors.text} ${card.colors.bg}/50 inline-block px-2 py-1 rounded-md`}>{card.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* === SECTION 2: กราฟแนวโน้ม (Trend Chart) === */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-6">
            <span className="text-emerald-500"><i className="fa-solid fa-chart-line"></i></span>
            แนวโน้มผู้เข้าชมไม่ซ้ำ {rangeDays} วันล่าสุด
          </h3>
          {trend.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              ยังไม่มีข้อมูลในช่วงเวลานี้
            </div>
          ) : (
            <div className="h-72 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...trend].reverse()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickFormatter={formatDay} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                     contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '12px' }}
                     labelFormatter={(label) => formatDay(label as string)}
                     formatter={(value: unknown) => [numberFormatter.format(Number(value || 0)), 'ผู้เข้าชมไม่ซ้ำ']}
                     labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="uniqueVisitors" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} 
                    activeDot={{ r: 6, strokeWidth: 0 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* === SECTION 3: Data Tables (ผู้ใช้ล่าสุด & อุปกรณ์) === */}
        <section className="grid gap-6 lg:grid-cols-5">
          {/* ตารางผู้ใช้ล่าสุด */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3 flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span className="text-emerald-500"><i className="fa-solid fa-clock-rotate-left"></i></span>
                ผู้ใช้งานล่าสุด (Recent Sessions)
              </h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {recentLength ? `ทั้งหมด ${recentLength} รายการ` : 'ยังไม่มีข้อมูล'}
              </span>
            </div>
            
            {recentLength === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 my-auto">
                ยังไม่มีข้อมูลผู้ใช้ล่าสุด
              </div>
            ) : (
              <>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                      <tr>
                        <th className="px-4 py-3">No.</th>
                        <th className="px-4 py-3">IP Address</th>
                        <th className="px-4 py-3">Device / Browser</th>
                        <th className="px-4 py-3 text-right">Hits</th>
                        <th className="px-4 py-3">Last Seen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedRecentSessions.map((session, idx) => {
                        const agentInfo = summarizeUserAgent(session.userAgent)
                        const ipLabel = session.ipAddress || 'unknown'
                        const relative = formatRelative(session.lastSeen)
                        const displayIndex = (recentPage - 1) * RECENT_PAGE_SIZE + idx + 1
                        return (
                          <tr key={`${session.lastSeen}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-900">{displayIndex}</td>
                            <td className="px-4 py-3">
                              <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{ipLabel}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ${agentInfo.isBot ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                {agentInfo.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-right">{numberFormatter.format(session.hits)}</td>
                            <td className="px-4 py-3">
                              <div className="text-slate-900">{formatDate(session.lastSeen)}</div>
                              {relative && <div className="text-[11px] text-slate-400 mt-0.5">{relative}</div>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                
                {recentTotalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                    <button
                      type="button"
                      onClick={() => setRecentPage(page => Math.max(1, page - 1))}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium hover:bg-slate-50 transition disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={recentPage === 1}
                    >
                      ก่อนหน้า
                    </button>
                    <span>หน้า {recentPage} / {recentTotalPages}</span>
                    <button
                      type="button"
                      onClick={() => setRecentPage(page => Math.min(recentTotalPages, page + 1))}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium hover:bg-slate-50 transition disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={recentPage === recentTotalPages}
                    >
                      ถัดไป
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* อุปกรณ์ยอดนิยม */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2 flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span className="text-emerald-500"><i className="fa-solid fa-laptop-mobile"></i></span>
                อุปกรณ์ยอดนิยม
              </h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {agentLength > 0 ? `${agentLength} รายการ` : 'ไม่มีข้อมูล'}
              </span>
            </div>
            
            {agentLength === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 my-auto">
                ยังไม่มีข้อมูลอุปกรณ์
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {paginatedTopAgents.map((agent, idx) => {
                    const agentInfo = summarizeUserAgent(agent.userAgent)
                    return (
                      <div key={`${agent.userAgent || 'unknown'}-${agentPage}-${idx}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3 hover:bg-slate-50 transition-colors">
                        <div className="truncate text-sm font-medium text-slate-700">{agentInfo.label}</div>
                        <div className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100 shrink-0">
                          {numberFormatter.format(agent.hits)} ครั้ง
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {agentTotalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between text-sm text-slate-500 border-t border-slate-100 pt-4 mt-auto">
                    <button
                      type="button"
                      onClick={() => setAgentPage(page => Math.max(1, page - 1))}
                      className="text-emerald-600 font-medium disabled:opacity-30 hover:underline"
                      disabled={agentPage === 1}
                    >
                      ‹ ก่อนหน้า
                    </button>
                    <span className="text-xs">หน้าที่ {agentPage} / {agentTotalPages}</span>
                    <button
                      type="button"
                      onClick={() => setAgentPage(page => Math.min(agentTotalPages, page + 1))}
                      className="text-emerald-600 font-medium disabled:opacity-30 hover:underline"
                      disabled={agentPage === agentTotalPages}
                    >
                      ถัดไป ›
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    )
  }
)

AdminIntroDashboard.displayName = 'AdminIntroDashboard'

export default AdminIntroDashboard
