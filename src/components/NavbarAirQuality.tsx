import { useEffect, useState, useMemo, useRef } from 'react'
import { buildApiUrl } from '../utils/api'

interface AirQualityData {
    dustboy_name: string
    pm25: number | null
    th_aqi: number
    th_title: string
    th_dustboy_icon: string
    log_datetime: string
}

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
    const [data, setData] = useState<AirQualityData | null>(null)
    const [loading, setLoading] = useState(true)
    const [imgError, setImgError] = useState(false)
    const lastFetchedRef = useRef<number>(0)
    const hasDataRef = useRef(false)

    const fetchAirQuality = async (isBackground = false) => {
        try {
            if (isBackground && Date.now() - lastFetchedRef.current < 55 * 60 * 1000) return
            if (!hasDataRef.current) setLoading(true)
            setImgError(false)

            const res = await fetch(buildApiUrl('/api/airquality'))
            if (!res.ok) throw new Error('API error')
            const json = await res.json()
            if (json.success && json.data) {
                hasDataRef.current = true
                setData(json.data)
            }
        } catch (e) {
            console.warn('Failed to fetch navbar air quality', e)
        } finally {
            lastFetchedRef.current = Date.now()
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAirQuality()

        let timeoutId: ReturnType<typeof setTimeout>
        const scheduleNextFetch = () => {
            const now = new Date()
            const next = new Date(now)
            if (now.getMinutes() >= 5) {
                next.setHours(now.getHours() + 1, 5, 0, 0)
            } else {
                next.setHours(now.getHours(), 5, 0, 0)
            }

            const delay = next.getTime() - now.getTime()
            timeoutId = setTimeout(() => {
                if (document.visibilityState === 'visible') fetchAirQuality(false)
                scheduleNextFetch()
            }, delay)
        }
        scheduleNextFetch()

        const onVisible = () => {
            if (document.visibilityState === 'visible') fetchAirQuality(true)
        }
        document.addEventListener('visibilitychange', onVisible)
        return () => {
            clearTimeout(timeoutId)
            document.removeEventListener('visibilitychange', onVisible)
        }
    }, [])

    const level = useMemo(() => getAqiLevel(data?.th_aqi ?? 0), [data?.th_aqi])
    const pm25Raw = data?.pm25 ?? '-'

    if (loading && !data) {
        return (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-100/60 rounded-full py-1.5 px-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0"></div>
                <div className="flex flex-col gap-1">
                    <div className="w-16 h-2 rounded bg-slate-200"></div>
                    <div className="w-12 h-4 rounded bg-slate-200"></div>
                </div>
            </div>
        )
    }

    if (!data) return null

    // Inline Desktop/Mobile Widget based on the design request
    return (
        <div
            className="flex items-center gap-3 lg:pl-4 lg:border-l border-slate-200 group relative"
        >
            {/* Mascot Avatar with Subtle Effect */}
            <div className="relative w-[42px] h-[42px] shrink-0 flex items-center justify-center rounded-full bg-slate-50 border border-slate-100 shadow-inner overflow-hidden transition-transform duration-300 group-hover:scale-105">
                {data.th_dustboy_icon && !imgError ? (
                    <img
                        src={buildApiUrl(`/api/images/airquality/${data.th_dustboy_icon}.png?w=100`)}
                        alt={level.label}
                        className="w-[120%] h-[120%] object-contain"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="w-full h-full" style={{ backgroundColor: level.accentColor }}></div>
                )}
            </div>

            <div className="flex flex-col justify-center">
                {/* Status Dot and Label */}
                <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                        className="w-1.5 h-1.5 rounded-full shadow-sm"
                        style={{ backgroundColor: level.accentColor }}
                    ></span>
                    <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-widest leading-none mt-0.5">
                        PM 2.5 รพ.ปง
                    </span>
                </div>

                {/* Numeric Value */}
                <div className="flex items-baseline gap-1" style={{ color: level.accentColor }}>
                    <span className="text-xl sm:text-[22px] font-black tabular-nums leading-none tracking-tight leading-none drop-shadow-sm">
                        {pm25Raw}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 ml-0.5">
                        µg/m<sup>3</sup>
                    </span>
                </div>
            </div>

            {/* Popover detail on hover */}
            <div className="absolute right-0 top-full mt-2 w-max px-3 py-2 bg-white rounded-lg shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform origin-top pointer-events-none translate-y-2 group-hover:translate-y-0 text-left">
                <div className="text-xs font-bold text-slate-700 mb-1">{data.th_title || level.label}</div>
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
