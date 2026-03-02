import { useState, useMemo } from 'react'
import { buildApiUrl } from '../utils/api'
import { useAirQualitySSE } from '../hooks/useAirQualitySSE'

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */
// AirQualityData type imported from useAirQualitySSE hook

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
        gradient: 'radial-gradient(circle, rgba(0,191,243,0.15) 0%, rgba(0,191,243,0) 70%)',
        accentColor: '#00BFF3',
        badgeBg: '#00BFF3',
        badgeText: '#ffffff',
        ringColor: 'rgba(0,191,243,0.5)',
        glowColor: 'rgba(0,191,243,0.2)',
    }
    if (aqi <= 50) return {
        icon: 'fa-face-smile',
        label: 'คุณภาพดี',
        gradient: 'radial-gradient(circle, rgba(0,166,81,0.15) 0%, rgba(0,166,81,0) 70%)',
        accentColor: '#00A651',
        badgeBg: '#00A651',
        badgeText: '#ffffff',
        ringColor: 'rgba(0,166,81,0.5)',
        glowColor: 'rgba(0,166,81,0.2)',
    }
    if (aqi <= 100) return {
        icon: 'fa-face-meh',
        label: 'ปานกลาง',
        gradient: 'radial-gradient(circle, rgba(253,192,78,0.2) 0%, rgba(253,192,78,0) 70%)',
        accentColor: '#FDC04E',
        badgeBg: '#FDC04E',
        badgeText: '#ffffff',
        ringColor: 'rgba(253,192,78,0.5)',
        glowColor: 'rgba(253,192,78,0.3)',
    }
    if (aqi <= 200) return {
        icon: 'fa-face-frown',
        label: 'เริ่มมีผลกระทบ',
        gradient: 'radial-gradient(circle, rgba(244,121,32,0.15) 0%, rgba(244,121,32,0) 70%)',
        accentColor: '#F47920',
        badgeBg: '#F47920',
        badgeText: '#ffffff',
        ringColor: 'rgba(244,121,32,0.5)',
        glowColor: 'rgba(244,121,32,0.2)',
    }
    return {
        icon: 'fa-face-dizzy',
        label: 'มีผลต่อสุขภาพ',
        gradient: 'radial-gradient(circle, rgba(227,0,15,0.15) 0%, rgba(227,0,15,0) 70%)',
        accentColor: '#E3000F',
        badgeBg: '#E3000F',
        badgeText: '#ffffff',
        ringColor: 'rgba(227,0,15,0.5)',
        glowColor: 'rgba(227,0,15,0.2)',
    }
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */
export default function AirQualityWidget() {
    const { data, loading, error } = useAirQualitySSE()
    const [imgError, setImgError] = useState(false)

    /* ── Derived values ── */
    const level = useMemo(() => getAqiLevel(data?.th_aqi ?? 0), [data?.th_aqi])
    const pm25Raw = data?.pm25 ?? data?.daily_pm25 ?? '-'

    // Check if we have any valid weather data to display
    const hasWeather = useMemo(() => {
        if (!data) return false;
        return (data.temp !== "" && data.temp != null) ||
            (data.humid !== "" && data.humid != null) ||
            (data.wind_speed !== "" && data.wind_speed != null) ||
            (data.daily_wind_speed !== "" && data.daily_wind_speed != null)
    }, [data])

    /* ── Loading skeleton ── */
    if (loading && !data) {
        return (
            <div className="relative overflow-hidden rounded-2xl border border-slate-100/60 bg-white/80 backdrop-blur-xl shadow-sm p-4 w-full h-[140px] sm:h-[120px]">
                <div className="animate-pulse flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-100 shrink-0" />
                        <div className="space-y-2">
                            <div className="h-2.5 bg-slate-100 rounded-full w-24" />
                            <div className="h-6 sm:h-8 bg-slate-100 rounded-full w-16" />
                        </div>
                    </div>
                    <div className="space-y-2 items-end flex flex-col shrink-0">
                        <div className="h-6 bg-slate-100 rounded-full w-20" />
                        <div className="h-2.5 bg-slate-100 rounded-full w-12" />
                    </div>
                </div>
                <div className="h-8 bg-slate-50/50 rounded-lg w-full" />
            </div>
        )
    }

    /* ── Error state ── */
    if (error && !data) {
        return (
            <div className="rounded-2xl border border-red-100/60 bg-gradient-to-br from-white to-red-50/40 p-5 w-full text-center shadow-sm">
                <div className="flex items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shadow-inner shrink-0">
                        <i className="fa-solid fa-cloud-bolt text-red-500 text-xl" />
                    </div>
                    <div className="flex flex-col items-start gap-1">
                        <p className="text-slate-600 text-[11px] sm:text-xs font-semibold">ไม่สามารถโหลดข้อมูลคุณภาพอากาศได้</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                        >
                            <i className="fa-solid fa-rotate-right mr-1" /> ลองอีกครั้ง
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (!data) return null

    /* ── Main render (Compact Widget Design) ── */
    return (
        <div className="w-full relative group font-sans">
            {/* ── Outer Ambient Glow ── */}
            <div
                className="absolute inset-0 rounded-[2rem] blur-2xl opacity-10 group-hover:opacity-20 transition-opacity duration-1000 ease-out pointer-events-none -z-10"
                style={{ background: level.gradient }}
            />

            {/* ── Main Compact Container ── */}
            <div className="relative rounded-2xl bg-white/95 backdrop-blur-xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col transition-all duration-300 overflow-hidden hover:shadow-md">

                {/* Top Section: Icon, Data, Badge */}
                <div className="p-4 sm:p-5 flex items-center justify-between gap-4">

                    {/* Left: Icon & Main Value */}
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                        <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 flex items-center justify-center rounded-full bg-gradient-to-b from-white to-slate-50/50 border border-slate-100 shadow-inner group-hover:scale-105 transition-transform duration-500">
                            {data.th_dustboy_icon && !imgError ? (
                                <img
                                    src={buildApiUrl(`/api/images/airquality/${data.th_dustboy_icon}.png?w=200`)}
                                    alt={level.label}
                                    className="w-[110%] h-[110%] object-contain drop-shadow-md z-20"
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <i className={`fa-solid ${level.icon} text-2xl sm:text-3xl drop-shadow-sm z-20`} style={{ color: level.accentColor }}></i>
                            )}
                        </div>

                        <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 mb-1 sm:mb-0.5">
                                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: level.accentColor }} />
                                <h3 className="text-[10px] sm:text-[11px] font-extrabold tracking-wider uppercase text-slate-800">
                                    PM 2.5 รพ.ปง
                                </h3>
                            </div>
                            <div className="flex items-baseline gap-1 group/number cursor-default">
                                <span className="text-3xl sm:text-4xl font-black tabular-nums tracking-tighter leading-none" style={{ color: level.accentColor }}>
                                    {pm25Raw}
                                </span>
                                <span className="text-[10px] sm:text-xs font-bold text-slate-500">µg/m³</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Badge & Details */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div
                            className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-extrabold shadow-sm border max-w-[100px] sm:max-w-[130px] text-center truncate"
                            style={{
                                backgroundColor: level.badgeBg || '#ffffff',
                                color: level.badgeText || level.accentColor,
                                borderColor: level.badgeText !== '#ffffff' ? level.badgeBg : 'rgba(255,255,255,0.4)'
                            }}
                            title={data.th_title || level.label}
                        >
                            {data.th_title || level.label}
                        </div>
                        <div className="flex items-center gap-1 sm:gap-1.5 text-slate-400">
                            <i className="fa-regular fa-clock text-[9px]"></i>
                            <span className="text-[9px] sm:text-[10px] font-semibold tracking-wide">
                                {data.log_datetime ? new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' }).format(new Date(data.log_datetime)) : '-'}
                            </span>
                        </div>
                    </div>
                </div>

                {(hasWeather || data.th_caption) ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between sm:justify-start w-full px-4 sm:px-5 py-2.5 text-[10px] sm:text-[11px] font-bold text-slate-500 border-t border-slate-50 bg-slate-50/50 z-10 bg-inherit">
                        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                            {(data.temp !== "" && data.temp != null) ? (
                                <span className="flex items-center gap-1.5"><i className="fa-solid fa-temperature-three-quarters text-orange-400"></i> {data.temp}°</span>
                            ) : null}
                            {(data.humid !== "" && data.humid != null) ? (
                                <span className="flex items-center gap-1.5"><i className="fa-solid fa-droplet text-sky-400"></i> {data.humid}%</span>
                            ) : null}
                        </div>

                        {data.th_caption ? (
                            <div className="flex items-center gap-1.5 max-w-full text-emerald-600/90 truncate sm:ml-4 mt-1 sm:mt-0" title={data.th_caption}>
                                <i className="fa-solid fa-notes-medical shrink-0"></i>
                                <span className="truncate">{data.th_caption}</span>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    )
}
