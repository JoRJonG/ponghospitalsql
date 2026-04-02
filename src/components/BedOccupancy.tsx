import { useEffect, useRef } from 'react'
import { useSWR } from '../hooks/useSWR'
import { buildApiUrl } from '../utils/api'

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_TOTAL_BEDS = 30
const API_KEY = buildApiUrl('/api/ward-stat')

// ─── Types ────────────────────────────────────────────────────────────────────
interface WardData {
  ward_code: string
  ward_name: string
  current_patients: number
  occupancy_percent: string | number
}

interface OutpatientDepartment {
  dep_code: string
  dep_name: string
  count: number
}

interface WardStatResponse {
  status: string
  last_update: string
  data: WardData[]
  ipd_summary?: {
    standard_capacity: number
    total_admit: number
    hospital_occupancy: string
    wards: WardData[]
  }
  outpatient_today?: {
    total_visit: number
    departments: OutpatientDepartment[]
  }
  stale?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getOccupancyLevel(pct: number): 'normal' | 'warning' | 'critical' | 'over' {
  if (pct >= 100) return 'over'
  if (pct >= 80) return 'critical'
  if (pct >= 60) return 'warning'
  return 'normal'
}

const levelConfig = {
  normal: { label: 'ปกติ', color: '#10b981', bg: '#d1fae5', border: '#a7f3d0', text: '#065f46', track: '#d1fae5' },
  warning: { label: 'ใกล้เต็ม', color: '#f59e0b', bg: '#fef3c7', border: '#fde68a', text: '#78350f', track: '#fef3c7' },
  critical: { label: 'เกือบเต็ม', color: '#f97316', bg: '#ffedd5', border: '#fed7aa', text: '#7c2d12', track: '#ffedd5' },
  over: { label: 'เกินกำลัง', color: '#e11d48', bg: '#ffe4e6', border: '#fecdd3', text: '#881337', track: '#ffe4e6' },
}

const barGradients = {
  normal: 'linear-gradient(90deg, #34d399, #10b981)',
  warning: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
  critical: 'linear-gradient(90deg, #fb923c, #f97316)',
  over: 'linear-gradient(90deg, #fb7185, #e11d48)',
}

// ─── Animated Donut Gauge ─────────────────────────────────────────────────────
function DonutGauge({ percent }: { percent: number }) {
  const level = getOccupancyLevel(percent)
  const cfg = levelConfig[level]
  const radius = 52
  const circ = 2 * Math.PI * radius
  const clamped = Math.min(percent, 100)
  const fillRef = useRef<SVGCircleElement>(null)

  useEffect(() => {
    const el = fillRef.current
    if (!el) return
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.strokeDashoffset = String(circ - (clamped / 100) * circ)
    }))
  }, [clamped, circ])

  return (
    <div className="bed2-gauge-wrap">
      <svg className="bed2-gauge-svg" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={radius + 6} fill="none" stroke={cfg.track} strokeWidth="1" opacity="0.6" />
        <circle cx="60" cy="60" r={radius} fill="none" stroke={cfg.track} strokeWidth="11" />
        <circle
          ref={fillRef}
          cx="60" cy="60" r={radius}
          fill="none"
          stroke={cfg.color}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)',
            filter: `drop-shadow(0 0 6px ${cfg.color}55)`,
          }}
        />
      </svg>
      <div className="bed2-gauge-center">
        <span className="bed2-gauge-pct" style={{ color: cfg.color }}>
          {percent.toFixed(0)}<span className="bed2-gauge-pct-unit">%</span>
        </span>
        <span className="bed2-gauge-label">ครองเตียง</span>
      </div>
    </div>
  )
}

// ─── Animated progress bar ────────────────────────────────────────────────────
function HorizBar({ percent, ward, overrideTotalBeds }: { percent: number; ward: WardData; overrideTotalBeds?: number }) {
  const level = getOccupancyLevel(percent)
  const cfg = levelConfig[level]
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = barRef.current
    if (!el) return
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.width = `${Math.min(percent, 100)}%`
    }))
  }, [percent])

  return (
    <div className="bed2-bar-row">
      <div className="bed2-bar-meta">
        <span className="bed2-bar-name">{ward.ward_name}</span>
        <span className="bed2-bar-info">
          <span style={{ color: cfg.text, fontWeight: 600 }}>{ward.current_patients}</span>
          {overrideTotalBeds ? <span className="bed2-bar-slash">/{overrideTotalBeds} เตียง</span> : null}
          <span
            className="bed2-bar-badge"
            style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
          >
            {percent.toFixed(1)}%
          </span>
        </span>
      </div>
      <div className="bed2-bar-track" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
        <div
          ref={barRef}
          className="bed2-bar-fill"
          style={{ width: '0%', background: barGradients[level] }}
        />
      </div>
    </div>
  )
}



// ─── OPD UI Components ────────────────────────────────────────────────────────
function OpdTotalBadge({ total }: { total: number }) {
  return (
    <div className="flex flex-col items-center justify-center w-[120px] h-[120px] rounded-[2rem] bg-gradient-to-br from-white to-sky-50 shadow-[0_8px_16px_-6px_rgba(14,165,233,0.15)] border border-sky-100 relative group overflow-hidden">
      <div className="absolute inset-0 bg-sky-400 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500" />
      <svg width="26" height="26" className="text-sky-500 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
      <span className="text-3xl font-extrabold bg-gradient-to-br from-sky-600 to-blue-700 bg-clip-text text-transparent leading-none mt-1" style={{ letterSpacing: '-0.02em' }}>
        {total}
      </span>
      <span className="text-[0.65rem] font-bold text-sky-500 uppercase tracking-wider mt-1 opacity-80">ผู้รับบริการ</span>
    </div>
  )
}

function OpdDepartmentList({ departments }: { departments: OutpatientDepartment[] }) {
  if (!departments || departments.length === 0) return null

  // Sort by count desc (show all)
  const topDeps = [...departments].sort((a, b) => b.count - a.count)
  const maxCount = topDeps[0]?.count || 1

  return (
    <div className="bed2-wards w-full">
      <p className="bed2-wards-label">ผู้เข้ารับบริการ (ทุกคลีนิก)</p>
      {/* เปลี่ยนมาใช้ Grid แบ่งคอลัมน์อัตโนมัติ เพื่อให้แสดงครบทุกอันโดยไม่ต้อง Scroll */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-7 gap-y-4 mt-4 w-full">
        {topDeps.map((dep, idx) => {
          const percent = (dep.count / maxCount) * 100
          // วนลูปสีไปเรื่อยๆ เพื่อรองรับแผนกที่เกิน 5 อันดับ
          const colors = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#f43f5e']
          const color = colors[idx % colors.length]

          return (
            <div key={dep.dep_code} className="flex flex-col gap-1.5 w-full">
              <div className="flex justify-between items-center text-[0.825rem] font-medium leading-none">
                <span className="text-slate-600 truncate pr-2 max-w-[80%]">{dep.dep_name}</span>
                <span className="text-slate-800 font-bold bg-slate-50 px-2 py-[2px] rounded-md border border-slate-200 shadow-sm">{dep.count}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-[1200ms] ease-out origin-left"
                  style={{ width: `${percent}%`, background: `linear-gradient(90deg, ${color}dd, ${color})` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BedOccupancy({ embedded = false }: { embedded?: boolean }) {
  const { data, error, isLoading } = useSWR<WardStatResponse>(
    API_KEY,
    async () => {
      const res = await fetch(API_KEY)
      if (!res.ok) throw new Error('ward-stat proxy error')
      return res.json()
    },
    { revalidateOnFocus: false, staleTime: 120_000, refreshInterval: 600_000 } // Poll every 10 min
  )

  const ipdSummary = data?.ipd_summary
  const opdData = data?.outpatient_today

  const totalPatients = ipdSummary?.total_admit ?? (data?.data?.reduce((s, w) => s + (Number(w.current_patients) || 0), 0) ?? 0)
  const totalBeds = ipdSummary?.standard_capacity ?? DEFAULT_TOTAL_BEDS
  const freeBeds = Math.max(totalBeds - totalPatients, 0)

  // Use HIS occupancy percent if available, otherwise calculate
  const rawOccupancy = ipdSummary?.hospital_occupancy ? parseFloat(ipdSummary.hospital_occupancy.replace('%', '')) : 0;
  const occupancyPct = ipdSummary?.hospital_occupancy ? rawOccupancy : (totalBeds > 0 && totalPatients >= 0 ? (totalPatients / totalBeds) * 100 : 0)

  const level = getOccupancyLevel(occupancyPct)
  const cfg = levelConfig[level]
  const lastUpdate = data?.last_update ?? ''
  const lastUpdateDate = lastUpdate ? lastUpdate.split(' ')[0] : ''
  const isStale = data?.stale === true

  return (
    <div className={`bed2-root${embedded ? ' bed2-root--embedded' : ''}`} aria-label="สถิติการให้บริการ">

      {/* ── Section header ── */}
      <div className="bed2-section-header">
        <div>
          <h2 className="bed2-section-title">
            สถิติปริมาณผู้รับบริการ
            {lastUpdateDate && <span className="text-emerald-500 block sm:inline sm:ml-2">วันที่ {lastUpdateDate}</span>}
          </h2>
          <p className="bed2-section-desc">ข้อมูลผู้ป่วยใน (IPD) และ ผู้ป่วยนอก (OPD) ประจำวันปัจจุบัน</p>
        </div>

        <div className="bed2-section-meta">
          {isStale && (
            <span className="bed2-stale-badge" title="ข้อมูลชั่วคราว">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              ข้อมูลชั่วคราว
            </span>
          )}
          {lastUpdate && (
            <time className="bed2-updated" dateTime={lastUpdate}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              อัปเดต {lastUpdate}
            </time>
          )}
        </div>
      </div>

      {/* ── Loading Skeleton ── */}
      {isLoading && !data && (
        <div className="flex flex-col gap-5 mt-4 w-full">
          <div className="bed2-card">
            <div className="bed2-skeleton">
              <div className="bed2-sk-gauge" />
              <div className="bed2-sk-right">
                <div className="bed2-sk-stat" />
                <div className="bed2-sk-stat" />
                <div className="bed2-sk-bar-wrap">
                  <div className="bed2-sk-bar" />
                  <div className="bed2-sk-bar" style={{ width: '70%' }} />
                </div>
              </div>
            </div>
          </div>
          <div className="bed2-card hidden lg:block">
            <div className="bed2-skeleton opacity-70">
              <div className="bed2-sk-gauge" />
              <div className="bed2-sk-right w-full grid grid-cols-3 gap-4">
                <div className="bed2-sk-bar-wrap w-full"><div className="bed2-sk-bar" style={{ width: '100%' }} /></div>
                <div className="bed2-sk-bar-wrap w-full"><div className="bed2-sk-bar" style={{ width: '80%' }} /></div>
                <div className="bed2-sk-bar-wrap w-full"><div className="bed2-sk-bar" style={{ width: '60%' }} /></div>
                <div className="bed2-sk-bar-wrap w-full"><div className="bed2-sk-bar" style={{ width: '90%' }} /></div>
                <div className="bed2-sk-bar-wrap w-full"><div className="bed2-sk-bar" style={{ width: '70%' }} /></div>
                <div className="bed2-sk-bar-wrap w-full"><div className="bed2-sk-bar" style={{ width: '50%' }} /></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Error State ── */}
      {error && !data && (
        <div className="bed2-card mt-4">
          <div className="bed2-error">
            <div className="bed2-error-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <div>
              <p className="bed2-error-title">ไม่สามารถโหลดข้อมูล</p>
              <p className="bed2-error-sub">กรุณาลองใหม่อีกครั้งภายหลัง</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Data Cards ── */}
      {data && (
        <div className="flex flex-col gap-6 mt-5 w-full items-stretch">

          {/* IPD Card */}
          <div className="bed2-card w-full h-full" style={{ borderLeftColor: cfg.color }}>
            <div className="bed2-body">
              <div className="bed2-left">
                <DonutGauge percent={occupancyPct} />
                <span className="bed2-status-pill" style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}>
                  ผู้ป่วยใน (IPD)
                </span>
              </div>

              <div className="bed2-right w-full flex-1 flex flex-col justify-center">

                {/* 3 Premium Stats Bento Grid - Responsive Design */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 xl:gap-6 w-full">

                  <div className="flex flex-row sm:flex-col items-center sm:items-start justify-between sm:justify-start px-4 py-3.5 sm:px-5 sm:py-6 bg-gradient-to-br from-white to-emerald-50/40 rounded-xl sm:rounded-2xl border border-emerald-100 shadow-[0_2px_8px_-4px_rgba(16,185,129,0.1)] sm:shadow-[0_4px_12px_-5px_rgba(16,185,129,0.15)] group transition-all sm:hover:-translate-y-0.5 hover:shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100/40 rounded-bl-[40px] sm:rounded-bl-[60px] -z-10 group-hover:scale-125 transition-transform duration-500 ease-out" />
                    <div className="flex items-center gap-2.5 sm:gap-3 sm:mb-4">
                      <div className="p-1.5 sm:p-2.5 bg-emerald-100/80 rounded-lg sm:rounded-xl text-emerald-600 shadow-inner group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                        <svg className="w-4 h-4 sm:w-[22px] sm:h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                      </div>
                      <span className="font-bold text-slate-700 text-sm sm:text-[0.95rem] tracking-tight">เตียงที่ใช้ไป</span>
                    </div>
                    <span className="text-3xl sm:text-5xl font-extrabold text-emerald-700 tracking-tight leading-none">{totalPatients}</span>
                  </div>

                  <div className="flex flex-row sm:flex-col items-center sm:items-start justify-between sm:justify-start px-4 py-3.5 sm:px-5 sm:py-6 bg-gradient-to-br from-white to-slate-50/80 rounded-xl sm:rounded-2xl border border-slate-200 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)] sm:shadow-[0_4px_12px_-5px_rgba(0,0,0,0.06)] group transition-all sm:hover:-translate-y-0.5 hover:shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-slate-100/50 rounded-bl-[40px] sm:rounded-bl-[60px] -z-10 group-hover:scale-125 transition-transform duration-500 ease-out" />
                    <div className="flex items-center gap-2.5 sm:gap-3 sm:mb-4">
                      <div className="p-1.5 sm:p-2.5 bg-slate-100 rounded-lg sm:rounded-xl text-slate-600 shadow-inner group-hover:bg-slate-600 group-hover:text-white transition-colors duration-300">
                        <svg className="w-4 h-4 sm:w-[22px] sm:h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 20h20" /><path d="M2 20V8a2 2 0 0 1 2-2h7" /><path d="M13 6h7a2 2 0 0 1 2 2v12" /><path d="M6 10v4" /><rect x="10" y="9" width="4" height="5" rx="1" /></svg>
                      </div>
                      <span className="font-bold text-slate-700 text-sm sm:text-[0.95rem] tracking-tight">เตียงทั้งหมด</span>
                    </div>
                    <span className="text-3xl sm:text-5xl font-extrabold text-slate-800 tracking-tight leading-none">{totalBeds}</span>
                  </div>

                  <div className="flex flex-row sm:flex-col items-center sm:items-start justify-between sm:justify-start px-4 py-3.5 sm:px-5 sm:py-6 bg-gradient-to-br from-white to-teal-50/40 rounded-xl sm:rounded-2xl border border-teal-100 shadow-[0_2px_8px_-4px_rgba(20,184,166,0.1)] sm:shadow-[0_4px_12px_-5px_rgba(20,184,166,0.15)] group transition-all sm:hover:-translate-y-0.5 hover:shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-teal-100/50 rounded-bl-[40px] sm:rounded-bl-[60px] -z-10 group-hover:scale-125 transition-transform duration-500 ease-out" />
                    <div className="flex items-center gap-2.5 sm:gap-3 sm:mb-4">
                      <div className="p-1.5 sm:p-2.5 bg-teal-100/80 rounded-lg sm:rounded-xl text-teal-600 shadow-inner group-hover:bg-teal-500 group-hover:text-white transition-colors duration-300">
                        <svg className="w-4 h-4 sm:w-[22px] sm:h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                      <span className="font-bold text-slate-700 text-sm sm:text-[0.95rem] tracking-tight">เตียงว่าง</span>
                    </div>
                    <span className="text-3xl sm:text-5xl font-extrabold text-teal-600 tracking-tight leading-none">{freeBeds}</span>
                  </div>
                </div>

                {/* Status Indicator Bar (fills the gap when no breakdown is needed) */}
                {(!data?.data || data.data.length <= 1) && (
                  <div className="mt-5 px-5 py-4 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3.5">
                      <span className="relative flex h-3.5 w-3.5">
                        {level !== 'normal' && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${level === 'over' ? 'bg-rose-400' : 'bg-amber-400'}`}></span>}
                        <span className={`relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-white shadow-sm ${level === 'over' ? 'bg-rose-500' : level === 'normal' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                      </span>
                      <span className="text-sm font-semibold text-slate-600">สถานะรวมระบบผู้ป่วยใน:
                        <span className={`ml-2 text-[0.9rem] px-2.5 py-0.5 rounded-full ${level === 'over' ? 'bg-rose-100 text-rose-700' : level === 'normal' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {cfg.label}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      ข้อมูลอัปเดตอัตโนมัติ
                    </div>
                  </div>
                )}

                {/* Ward breakdown bars (only when > 1 ward) */}
                {(data?.data?.length ?? 0) > 1 && (
                  <div className="bed2-wards w-full mt-4">
                    <p className="bed2-wards-label">รายละเอียดตามหอผู้ป่วย</p>
                    {data.data.map(ward => {
                      const wardPct = totalBeds > 0 ? (Number(ward.current_patients) / totalBeds) * 100 : 0
                      return <HorizBar key={ward.ward_code} percent={wardPct} ward={ward} overrideTotalBeds={totalBeds} />
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* OPD Card */}
          {opdData && (
            <div className="bed2-card w-full h-full relative" style={{ borderLeftColor: '#0ea5e9' }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-sky-100/50 rounded-bl-[100px] -z-10" />
              <div className="bed2-body items-center h-full">

                <div className="bed2-left">
                  <OpdTotalBadge total={opdData.total_visit} />
                  <span className="bed2-status-pill mt-[0.65rem]" style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}>
                    ผู้ป่วยนอก (OPD)
                  </span>
                </div>

                <div className="bed2-right w-full flex-1 flex flex-col justify-center">
                  <OpdDepartmentList departments={opdData.departments} />
                </div>

              </div>
            </div>
          )}

        </div>
      )}

    </div>
  )
}
