import { useEffect, useState, useCallback, useMemo } from 'react'
import { buildApiUrl } from '../utils/api'

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */
interface AirQualityData {
    dustboy_name: string
    pm25: number | null
    pm10: number | null
    us_aqi: string
    us_color: string
    us_title: string
    us_dustboy_icon: string
    th_aqi: number
    th_color: string
    th_title: string
    th_caption: string
    th_dustboy_icon: string
    daily_pm25: number | null
    daily_pm10: number | null
    daily_th_aqi: number
    daily_th_title: string
    daily_th_color: string
    log_datetime: string
    temp: number | null
    humid: number | null
}

/* ──────────────────────────────────────────────
   Level configs — semantic colors + icons
   ────────────────────────────────────────────── */
interface LevelConfig {
    icon: string
    label: string
    gradient: string         // card bg gradient
    accentColor: string      // icon / text accent
    badgeBg: string          // badge background
    badgeText: string        // badge text color
    ringColor: string        // outer ring on icon
    glowColor: string        // subtle glow behind value
}

function getAqiLevel(aqi: number): LevelConfig {
    if (aqi <= 25) return {
        icon: 'fa-face-smile-beam',
        label: 'คุณภาพดีมาก',
        gradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
        accentColor: '#059669',
        badgeBg: '#d1fae5',
        badgeText: '#065f46',
        ringColor: '#6ee7b7',
        glowColor: 'rgba(16, 185, 129, 0.10)',
    }
    if (aqi <= 50) return {
        icon: 'fa-face-smile',
        label: 'คุณภาพดี',
        gradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        accentColor: '#16a34a',
        badgeBg: '#dcfce7',
        badgeText: '#15803d',
        ringColor: '#86efac',
        glowColor: 'rgba(34, 197, 94, 0.10)',
    }
    if (aqi <= 100) return {
        icon: 'fa-face-meh',
        label: 'ปานกลาง',
        gradient: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
        accentColor: '#ca8a04',
        badgeBg: '#fef9c3',
        badgeText: '#a16207',
        ringColor: '#fde047',
        glowColor: 'rgba(234, 179, 8, 0.10)',
    }
    if (aqi <= 200) return {
        icon: 'fa-face-frown',
        label: 'เริ่มมีผลกระทบ',
        gradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
        accentColor: '#ea580c',
        badgeBg: '#ffedd5',
        badgeText: '#c2410c',
        ringColor: '#fdba74',
        glowColor: 'rgba(249, 115, 22, 0.12)',
    }
    if (aqi <= 300) return {
        icon: 'fa-face-dizzy',
        label: 'มีผลต่อสุขภาพ',
        gradient: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
        accentColor: '#dc2626',
        badgeBg: '#fee2e2',
        badgeText: '#b91c1c',
        ringColor: '#fca5a5',
        glowColor: 'rgba(239, 68, 68, 0.12)',
    }
    return {
        icon: 'fa-skull-crossbones',
        label: 'อันตราย',
        gradient: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
        accentColor: '#991b1b',
        badgeBg: '#fecaca',
        badgeText: '#7f1d1d',
        ringColor: '#f87171',
        glowColor: 'rgba(185, 28, 28, 0.15)',
    }
}

/** PM2.5 color by Thai standard (µg/m³) */
function getPm25Style(val: number | string) {
    if (typeof val !== 'number') return { color: '#64748b', bg: '#f1f5f9' }
    if (val <= 15) return { color: '#0369a1', bg: '#e0f2fe' }   // ฟ้า — ดีมาก
    if (val <= 25) return { color: '#15803d', bg: '#dcfce7' }   // เขียว — ดี
    if (val <= 37.5) return { color: '#a16207', bg: '#fef9c3' }   // เหลือง — ปานกลาง
    if (val <= 75) return { color: '#c2410c', bg: '#ffedd5' }   // ส้ม — เริ่มมีผลกระทบ
    return { color: '#b91c1c', bg: '#fee2e2' }       // แดง — อันตราย
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */
export default function AirQualityWidget() {
    const [data, setData] = useState<AirQualityData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    const fetchAirQuality = useCallback(async () => {
        try {
            setLoading(true)
            setError(false)
            const res = await fetch(buildApiUrl('/api/airquality'))
            if (!res.ok) throw new Error('API error')
            const json = await res.json()
            if (json.success && json.data) {
                setData(json.data)
            } else {
                throw new Error('Invalid data')
            }
        } catch {
            setError(true)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchAirQuality()
        const interval = setInterval(fetchAirQuality, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [fetchAirQuality])

    /* ── Derived values ── */
    const level = useMemo(() => getAqiLevel(data?.th_aqi ?? 0), [data?.th_aqi])
    const pm25Raw = data?.pm25 ?? data?.daily_pm25 ?? '-'
    const pm25Color = useMemo(() => getPm25Style(pm25Raw), [pm25Raw])

    const formattedDate = useMemo(() => {
        if (!data?.log_datetime) return ''
        return new Date(data.log_datetime).toLocaleString('th-TH', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        })
    }, [data?.log_datetime])

    /* ── Loading skeleton ── */
    if (loading && !data) {
        return (
            <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6">
                <div className="animate-pulse">
                    <div className="flex items-center gap-4 mb-5">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-slate-100 rounded-lg w-44" />
                            <div className="h-3 bg-slate-100 rounded-lg w-60" />
                        </div>
                    </div>
                    <div className="h-24 bg-slate-50 rounded-2xl" />
                </div>
            </div>
        )
    }

    /* ── Error state ── */
    if (error && !data) {
        return (
            <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-white to-red-50/40 p-6 text-center">
                <div className="inline-flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
                        <i className="fa-solid fa-cloud-bolt text-red-300 text-2xl" />
                    </div>
                    <p className="text-slate-500 text-sm">ไม่สามารถโหลดข้อมูลคุณภาพอากาศได้</p>
                    <button
                        onClick={fetchAirQuality}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full transition-all duration-200"
                    >
                        <i className="fa-solid fa-rotate-right text-[10px]" /> ลองอีกครั้ง
                    </button>
                </div>
            </div>
        )
    }

    if (!data) return null

    /* ── Main render ── */
    return (
        <div
            className="relative overflow-hidden rounded-2xl border border-slate-100 transition-all duration-500 hover:shadow-lg group"
            style={{ background: level.gradient }}
        >
            {/* Decorative floating dots */}
            <div
                className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-[0.07] pointer-events-none"
                style={{ background: `radial-gradient(circle, ${level.accentColor} 0%, transparent 70%)` }}
            />
            <div
                className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full opacity-[0.05] pointer-events-none"
                style={{ background: `radial-gradient(circle, ${level.accentColor} 0%, transparent 70%)` }}
            />

            <div className="relative z-10 p-5 sm:p-6">
                {/* ── Header ── */}
                <div className="flex items-center gap-4 mb-4">
                    {/* Icon with animated ring */}
                    <div className="relative flex-shrink-0">
                        <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105"
                            style={{
                                backgroundColor: level.badgeBg,
                                boxShadow: `0 0 0 3px ${level.ringColor}40, 0 2px 8px ${level.glowColor}`,
                            }}
                        >
                            <i
                                className={`fa-solid ${level.icon} text-2xl transition-colors duration-500`}
                                style={{ color: level.accentColor }}
                            />
                        </div>
                        {/* Live pulse dot */}
                        <span
                            className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                            style={{ backgroundColor: level.accentColor }}
                        >
                            <span
                                className="absolute inset-0 rounded-full animate-ping opacity-40"
                                style={{ backgroundColor: level.accentColor }}
                            />
                        </span>
                    </div>

                    {/* Title + meta */}
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <h2 className="text-[15px] font-bold text-slate-800 leading-snug">
                                คุณภาพอากาศ อ.ปง
                            </h2>
                            <span
                                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap"
                                style={{ backgroundColor: level.badgeBg, color: level.badgeText, border: `1px solid ${level.ringColor}60` }}
                            >
                                <i className={`fa-solid ${level.icon} text-[9px]`} />
                                {data.th_title || level.label}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 flex-wrap">
                            <span className="inline-flex items-center gap-1">
                                <i className="fa-solid fa-location-dot text-emerald-500 text-[9px]" />
                                <span>จุดวัด รพ.ปง</span>
                            </span>
                            {formattedDate && (
                                <span className="inline-flex items-center gap-1 text-slate-400">
                                    <span className="mx-0.5">·</span>
                                    <i className="fa-regular fa-clock text-[9px]" />
                                    {formattedDate}
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {/* ── PM 2.5 value card ── */}
                <div
                    className="relative rounded-2xl p-5 text-center transition-all duration-500 overflow-hidden"
                    style={{
                        backgroundColor: pm25Color.bg,
                        boxShadow: `inset 0 0 0 1px ${pm25Color.color}15, 0 1px 3px ${pm25Color.color}08`,
                    }}
                >
                    {/* Subtle inner glow */}
                    <div
                        className="absolute inset-0 opacity-[0.04] pointer-events-none"
                        style={{ background: `radial-gradient(ellipse at center, ${pm25Color.color} 0%, transparent 70%)` }}
                    />
                    <div className="relative z-10">
                        <p
                            className="text-[10px] uppercase tracking-[0.15em] font-bold mb-2 opacity-60"
                            style={{ color: pm25Color.color }}
                        >
                            <i className="fa-solid fa-wind mr-1" />
                            PM 2.5
                        </p>
                        <p
                            className="text-5xl sm:text-6xl font-extrabold leading-none tracking-tight transition-colors duration-500"
                            style={{ color: pm25Color.color }}
                        >
                            {pm25Raw}
                        </p>
                        <p
                            className="text-[11px] font-medium mt-2 opacity-50"
                            style={{ color: pm25Color.color }}
                        >
                            µg/m³
                        </p>
                    </div>
                </div>

                {/* ── Caption ── */}
                {data.th_caption && (
                    <div
                        className="mt-3 flex items-start gap-2.5 rounded-xl px-4 py-3 text-left"
                        style={{ backgroundColor: `${level.accentColor}08`, border: `1px solid ${level.accentColor}12` }}
                    >
                        <i className="fa-solid fa-circle-info mt-0.5 flex-shrink-0 text-xs" style={{ color: level.accentColor, opacity: 0.6 }} />
                        <p className="text-[11px] text-slate-600 leading-relaxed">{data.th_caption}</p>
                    </div>
                )}

                {/* ── Credit ── */}
                <p className="mt-3 text-[9px] text-slate-400 text-right tracking-wide">
                    ข้อมูลจาก <span className="font-semibold">DustBoy</span> — CMU CCDC
                </p>
            </div>
        </div>
    )
}
