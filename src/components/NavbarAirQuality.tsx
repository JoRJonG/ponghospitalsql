import { useEffect, useRef, useState, useMemo } from 'react'
import { buildApiUrl } from '../utils/api'
import { useAirQualitySSE } from '../hooks/useAirQualitySSE'

// AirQualityData type imported from useAirQualitySSE hook

/* ──────────────────────────────────────────────
   Level configs — semantic colors
   ────────────────────────────────────────────── */
interface LevelConfig {
    label: string
    accentColor: string      // icon / text accent
    badgeBg: string          // badge background
    badgeText: string        // badge text color
}

function getAqiLevel(aqi: number): LevelConfig {
    if (aqi <= 25) return {
        label: 'ดีมาก',
        accentColor: '#00BFF3',
        badgeBg: '#00BFF3',
        badgeText: '#ffffff',
    }
    if (aqi <= 50) return {
        label: 'ดี',
        accentColor: '#00A651',
        badgeBg: '#00A651',
        badgeText: '#ffffff',
    }
    if (aqi <= 100) return {
        label: 'ปานกลาง',
        accentColor: '#FDC04E',
        badgeBg: '#FDC04E',
        badgeText: '#ffffff',
    }
    if (aqi <= 200) return {
        label: 'เริ่มมีผลกระทบ',
        accentColor: '#F47920',
        badgeBg: '#F47920',
        badgeText: '#ffffff',
    }
    return {
        label: 'มีผลต่อสุขภาพ',
        accentColor: '#E3000F',
        badgeBg: '#E3000F',
        badgeText: '#ffffff',
    }
}

export default function NavbarAirQuality() {
    const { data, loading } = useAirQualitySSE()
    const [imgError, setImgError] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // ปิด popover เมื่อ click นอก component
    useEffect(() => {
        function handleClickOutside(event: MouseEvent | TouchEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('touchstart', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('touchstart', handleClickOutside)
        }
    }, [])

    const level = useMemo(() => getAqiLevel(data?.th_aqi ?? 0), [data?.th_aqi])
    const pm25Raw = data?.pm25 ?? '-'

    if (loading && !data) {
        return (
            <div className="flex items-center lg:pl-4 lg:border-l border-slate-200 group relative h-[42px] w-[170px] shrink-0">
                <div className="flex items-center gap-2.5 h-[40px] w-full rounded-full pl-1 pr-3 border border-slate-100 bg-slate-50">
                    <div className="w-[34px] min-w-[34px] h-[34px] rounded-full bg-slate-200 animate-pulse shrink-0"></div>
                    <div className="flex flex-col justify-center animate-pulse gap-1.5 w-full pr-2">
                        <div className="h-2 w-16 bg-slate-200 rounded"></div>
                        <div className="h-3.5 w-[50px] bg-slate-200 rounded"></div>
                    </div>
                </div>
            </div>
        )
    }

    if (!data) return (
        <div className="flex items-center lg:pl-4 lg:border-l border-slate-200 group relative invisible h-[42px] w-[170px] shrink-0">
        </div>
    )

    // Inline Desktop/Mobile Widget based on the design request
    return (
        <div
            ref={containerRef}
            className="flex items-center lg:pl-4 lg:border-l border-slate-200 relative h-[42px] w-[170px] shrink-0 cursor-pointer group"
            onClick={() => setIsOpen(!isOpen)}
        >
            {/* Colored Glow Pill Container */}
            <div
                className="flex items-center gap-2.5 h-[40px] w-full rounded-full pl-1 pr-3 cursor-pointer transition-all duration-300 hover:scale-105 border overflow-visible"
                style={{
                    backgroundColor: `${level.accentColor}1A`, // 10% opacity wash
                    borderColor: `${level.accentColor}4D`,     // 30% opacity border
                    boxShadow: `0 4px 12px ${level.accentColor}1A` // subtle glowing shadow
                }}
            >
                {/* Mascot Avatar - Slightly protruding */}
                <div className="relative w-[34px] min-w-[34px] max-w-[34px] h-[34px] shrink-0 flex items-center justify-center rounded-full bg-white shadow-sm border border-white/80">
                    {data.th_dustboy_icon && !imgError ? (
                        <img
                            src={buildApiUrl(`/api/images/airquality/${data.th_dustboy_icon}.png?w=100`)}
                            alt={level.label}
                            className="w-[110%] h-[110%] object-contain drop-shadow-sm scale-105"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="w-full h-full rounded-full" style={{ backgroundColor: level.accentColor }}></div>
                    )}
                </div>

                <div className="flex flex-col justify-center w-full">
                    {/* Status Dot and Label (Live Indicator) */}
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="relative flex h-1.5 w-1.5">
                            <span
                                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                                style={{ backgroundColor: level.accentColor }}
                            />
                            <span
                                className="relative inline-flex rounded-full h-1.5 w-1.5"
                                style={{ backgroundColor: level.accentColor }}
                            />
                        </span>
                        <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wide leading-none">
                            PM 2.5 รพ.ปง
                        </span>
                    </div>

                    {/* Numeric Value */}
                    <div className="flex items-baseline gap-1" style={{ color: level.accentColor }}>
                        <span className="text-xl font-black tabular-nums leading-none tracking-tight drop-shadow-sm">
                            {pm25Raw}
                        </span>
                        <span className="text-[10px] font-bold opacity-90" style={{ color: level.accentColor }}>
                            µg/m<sup className="font-semibold text-[8px]">3</sup>
                        </span>
                    </div>
                </div>
            </div>

            {/* Popover detail on hover / tap */}
            <div className={`absolute left-0 lg:left-auto lg:right-0 top-full mt-2 w-max max-w-[90vw] px-3 py-2 bg-white rounded-lg shadow-xl border border-slate-100 transition-all duration-200 z-[100] transform origin-top pointer-events-none text-left ${isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2 lg:group-hover:opacity-100 lg:group-hover:visible lg:group-hover:translate-y-0'}`}>
                <div
                    className="text-xs font-bold mb-1 truncate"
                    style={{ color: level.accentColor }}
                >
                    {data.th_title || level.label}
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                    <i className="fa-solid fa-location-dot text-emerald-500 w-3 text-center"></i>
                    <span>จุดตรวจวัด: <strong className="text-slate-600">{data.dustboy_name || 'โรงพยาบาลปง'}</strong></span>
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <i className="fa-regular fa-clock w-3 text-center"></i>
                    <span>อัปเดต: {data.log_datetime ? new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(new Date(data.log_datetime)) : '-'}</span>
                </div>
            </div>
        </div>
    )
}
