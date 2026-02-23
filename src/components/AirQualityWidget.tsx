import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { buildApiUrl } from '../utils/api'
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts'

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
    temp: string | number | null
    humid: string | number | null
    wind_speed: string | number | null
    daily_wind_speed: string | number | null
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
    const [data, setData] = useState<AirQualityData | null>(null)
    const [history, setHistory] = useState<{ time: string; datetime: string; pm25: number }[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [showInfo, setShowInfo] = useState(false)
    const [imgError, setImgError] = useState(false)
    // เก็บเวลาที่ fetch ครั้งล่าสุด เพื่อ debounce เมื่อกลับมา tab
    const lastFetchedRef = useRef<number>(0)
    // ใช้ ref แทน state เพื่อตรวจสอบว่ามีข้อมูลแล้วหรือยัง
    // (ถ้าใช้ state `data` โดยตรงใน useCallback จะเกิด infinite loop)
    const hasDataRef = useRef(false)
    const [isMounted, setIsMounted] = useState(false)

    const fetchAirQuality = useCallback(async (isBackground = false) => {
        try {
            // ถ้าเรียกจาก background (visibilitychange) ให้ fetch ใหม่เฉพาะเมื่อ
            // ผ่านมานานกว่า 55 นาทีจาก fetch ล่าสุด (data อัพเดทรายชั่วโมง)
            if (isBackground && Date.now() - lastFetchedRef.current < 55 * 60 * 1000) return
            // แสดง loading เฉพาะตอนที่ยังไม่มีข้อมูลเลย (โหลดครั้งแรก)
            if (!hasDataRef.current) setLoading(true)
            setError(false)
            setImgError(false)

            const [res, historyRes] = await Promise.all([
                fetch(buildApiUrl('/api/airquality')),
                fetch(buildApiUrl('/api/airquality/history'))
            ])

            if (!res.ok) throw new Error('API error')
            const json = await res.json()
            if (json.success && json.data) {
                hasDataRef.current = true // บอกว่ามีข้อมูลแล้ว ไม่ต้องแสดง loading อีก
                setData(json.data)
            } else {
                throw new Error('Invalid data')
            }

            if (historyRes.ok) {
                const hJson = await historyRes.json()
                if (hJson.success && hJson.data && Array.isArray(hJson.data.value)) {
                    // The backend now filters and sends only today's data. 
                    // We just reverse it to show chronologically (morning -> current time)
                    const todaysData = [...hJson.data.value].reverse()
                    let chartData = todaysData.map((item: { log_datetime: string; pm25: number }) => {
                        // นำเวลาเดิมมาแปลงเป็น Date Object
                        const d = new Date(item.log_datetime.replace(' ', 'T'))
                        // ทำการบวกเพิ่ม 1 ชั่วโมง เพื่อชดเชยเวลาให้ตรงกับข้อมูลจาก API หลัก
                        d.setHours(d.getHours() + 1)

                        const pad = (n: number) => n.toString().padStart(2, '0')
                        const newDatetime = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`

                        return {
                            // เก็บเวลา HH:mm สำหรับใช้ใน tooltip
                            time: newDatetime.split(' ')[1].substring(0, 5),
                            // เก็บ datetime เต็มสำหรับ label แกน X ที่ข้ามวัน
                            datetime: newDatetime,
                            pm25: item.pm25
                        }
                    })

                    // กรองข้อมูลไม่ให้เวลาเกินเวลาของข้อมูลหลัก (เพื่อให้กราฟสิ้นสุดที่เวลาเดียวกับตัวเลขใหญ่)
                    if (json.data && json.data.log_datetime) {
                        const mainTimeMs = new Date(json.data.log_datetime.replace(' ', 'T')).getTime()
                        chartData = chartData.filter(item => {
                            const itemTimeMs = new Date(item.datetime.replace(' ', 'T')).getTime()
                            return itemTimeMs <= mainTimeMs
                        })
                    }

                    setHistory(chartData)
                }
            }

        } catch {
            setError(true)
        } finally {
            lastFetchedRef.current = Date.now()
            setLoading(false)
        }
    }, []) // ไม่มี dependency — ใช้ ref แทน state เพื่อป้องกัน infinite loop

    useEffect(() => {
        setIsMounted(true)
        fetchAirQuality()

        let timeoutId: ReturnType<typeof setTimeout>

        // คำนวณเวลาและดึงข้อมูลตอน "นาทีที่ 5" ของแต่ละชั่วโมง 
        // (ให้รอ DustBoy ประมวลผลก่อน ค่อยดึงข้อมูล เพื่อไม่ให้ได้ข้อมูลของชั่วโมงที่แล้ว)
        const scheduleNextFetch = () => {
            const now = new Date()
            const next = new Date(now)
            // ถ้านาทีปัจจุบันเลยนาทีที่ 5 ไปแล้ว ให้ไปดึงตอนนาทีที่ 5 ของชั่วโมงถัดไป
            if (now.getMinutes() >= 5) {
                next.setHours(now.getHours() + 1, 5, 0, 0)
            } else {
                // ถ้ายังไม่ถึงนาทีที่ 5 (เช่น 19:01) ให้ดึงตอน 19:05 ของชั่วโมงนี้เลย
                next.setHours(now.getHours(), 5, 0, 0)
            }

            const delay = next.getTime() - now.getTime()
            timeoutId = setTimeout(() => {
                if (document.visibilityState === 'visible') fetchAirQuality(false)
                scheduleNextFetch() // ตั้งเวลาสำหรับรอบถัดไป
            }, delay)
        }

        scheduleNextFetch()

        // fetch เมื่อ user กลับมาที่ tab แต่ต้องนานกว่า 55 นาทีจาก fetch ล่าสุดก่อน
        const onVisible = () => {
            if (document.visibilityState === 'visible') fetchAirQuality(true)
        }
        document.addEventListener('visibilitychange', onVisible)

        return () => {
            clearTimeout(timeoutId)
            document.removeEventListener('visibilitychange', onVisible)
        }
    }, [fetchAirQuality])

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
            <div className="relative overflow-hidden rounded-3xl border border-slate-100/60 bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
                <div className="animate-pulse">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 rounded-[1.25rem] bg-slate-100" />
                        <div className="flex-1 space-y-3">
                            <div className="h-4 bg-slate-100 rounded-lg w-44" />
                            <div className="h-3 bg-slate-100 rounded-lg w-60" />
                        </div>
                    </div>
                    {/* Increased the skeleton height dramatically to prevent CLS when Bento box loads */}
                    <div className="h-[180px] md:h-[220px] lg:h-[260px] bg-slate-50 rounded-[2rem]" />
                </div>
            </div>
        )
    }

    /* ── Error state ── */
    if (error && !data) {
        return (
            <div className="rounded-3xl border border-red-100/60 bg-gradient-to-br from-white to-red-50/40 p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="inline-flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-[1.25rem] bg-red-50 flex items-center justify-center shadow-inner">
                        <i className="fa-solid fa-cloud-bolt text-red-400 text-3xl" />
                    </div>
                    <p className="text-slate-500 text-sm font-medium">ไม่สามารถโหลดข้อมูลคุณภาพอากาศได้</p>
                    <button
                        onClick={() => fetchAirQuality()}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-full transition-all duration-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                    >
                        <i className="fa-solid fa-rotate-right" /> ลองอีกครั้ง
                    </button>
                </div>
            </div>
        )
    }

    if (!data) return null

    /* ── Main render (Bento Box Dashboard Design) ── */
    return (
        <div className="w-full relative group font-sans">
            {/* ── Outer Ambient Glow ── */}
            <div
                className="absolute inset-0 rounded-[3rem] blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000 ease-out pointer-events-none -z-10"
                style={{ background: level.gradient }}
            />

            {/* ── Main Bento Container ── */}
            <div className="relative rounded-[2rem] bg-white/95 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col transition-all duration-700 p-4 lg:p-5">

                {/* Top Control Bar */}
                <div className="flex justify-between items-center w-full mb-4 relative z-20">
                    <div className="inline-flex items-center gap-2 bg-slate-50/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-100/50 shrink-0">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-location-dot text-slate-600 text-[10px]"></i>
                        </div>
                        <span className="font-extrabold text-slate-700 text-[13px] tracking-wide whitespace-nowrap">จุดตรวจวัดฝุ่น PM 2.5 โรงพยาบาลปง</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 text-slate-500 bg-slate-50/80 px-3 py-1.5 rounded-full border border-slate-100/50">
                            <i className="fa-regular fa-clock text-[10px]"></i>
                            <span className="text-[10px] font-bold tracking-wide">
                                {data.log_datetime ? new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(new Date(data.log_datetime)) : '-'}
                            </span>
                        </div>

                        {/* Info Button & Popover */}
                        <div className="relative shrink-0">
                            <button
                                onClick={() => setShowInfo(!showInfo)}
                                className={`flex-shrink-0 w-9 h-9 rounded-full backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.04)] border flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 focus:outline-none ${showInfo ? 'bg-white text-slate-700 border-white shadow-md' : 'bg-white/80 text-slate-400 border-white/60 hover:bg-white hover:text-slate-600'}`}
                                aria-label="ข้อมูลอ้างอิง"
                            >
                                <i className="fa-solid fa-info text-[11px]"></i>
                            </button>

                            {/* Info Popover */}
                            {showInfo && (
                                <div
                                    className="absolute right-0 top-12 w-64 sm:w-72 p-5 bg-white/95 backdrop-blur-3xl border border-white/80 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] rounded-2xl z-50 origin-top-right transform transition-all"
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-6 h-6 rounded-full bg-sky-50 flex items-center justify-center">
                                            <i className="fa-solid fa-circle-info text-sky-500 text-[10px]"></i>
                                        </div>
                                        <h5 className="font-extrabold text-slate-700 text-sm tracking-wide">แหล่งที่มาข้อมูล</h5>
                                    </div>
                                    <p className="text-[13px] text-slate-600 leading-relaxed font-medium mb-4">
                                        ข้อมูลระดับคุณภาพอากาศ (PM 2.5), สภาพอากาศ และคำแนะนำด้านสุขภาพทั้งหมด อ้างอิงแบบเรียลไทม์จากแพลตฟอร์ม <b>DustBoy</b> (เครือข่ายเซ็นเซอร์อัจฉริยะ)
                                    </p>
                                    <button
                                        onClick={() => setShowInfo(false)}
                                        className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/50 rounded-xl text-xs font-bold transition-colors"
                                    >
                                        ปิดหน้าต่าง
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Dashboard Layout ── */}
                <div className="flex flex-col gap-4 relative z-10 w-full h-full">

                    {/* Main Card: Big Number + Avatar + Chart */}
                    <div
                        className="backdrop-blur-xl rounded-3xl border shadow-sm p-4 sm:p-5 lg:p-6 flex flex-col justify-center relative overflow-hidden group/box"
                        style={{
                            background: `linear-gradient(135deg, ${level.badgeBg}95 0%, ${level.badgeBg}40 100%)`,
                            borderColor: `${level.accentColor}30`
                        }}
                    >

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 lg:gap-6 items-center w-full relative z-10">

                            {/* Column 1: Big Number */}
                            <div className="flex flex-col justify-center order-2 md:order-1 border-t md:border-t-0 border-white/40 pt-4 md:pt-0">
                                <div className="inline-flex items-center gap-1.5 mb-2">
                                    <span className="w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: level.accentColor }}></span>
                                    <h3 className="text-[10px] sm:text-xs font-extrabold tracking-[0.2em] uppercase text-slate-800 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                                        ปริมาณฝุ่นละออง PM 2.5
                                    </h3>
                                </div>

                                <div className="flex flex-wrap items-baseline gap-2 group/number cursor-default mt-2">
                                    <span
                                        className="text-7xl sm:text-8xl lg:text-[7.5rem] font-bold tabular-nums leading-[0.8] tracking-tight transition-transform duration-500 group-hover/number:scale-[1.02] origin-left drop-shadow-[0_4px_8px_rgba(255,255,255,0.6)]"
                                        style={{ color: level.accentColor }}
                                    >
                                        {pm25Raw}
                                    </span>
                                    <div className="flex flex-col items-start justify-end pb-1 lg:pb-3 ml-1">
                                        <span className="text-xl lg:text-2xl font-bold text-slate-800 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                                            µg/m³
                                        </span>
                                        <span className="text-[10px] sm:text-xs font-bold tracking-wide mt-1 text-slate-700 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                                            (รายชั่วโมง)
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Column 2: Center Avatar */}
                            <div className="flex flex-col items-center justify-center order-1 md:order-2 px-2">
                                <div className="relative w-32 h-32 sm:w-36 sm:h-36 lg:w-44 lg:h-44 mx-auto flex items-center justify-center mb-6">

                                    {/* Minimalist Backdrop */}
                                    <div className="absolute inset-4 rounded-full bg-gradient-to-b from-white to-slate-50/50 shadow-sm border border-slate-100/50"></div>

                                    <div className="relative w-full h-full flex flex-col items-center justify-center z-10">
                                        {data.th_dustboy_icon && !imgError ? (
                                            <img
                                                src={buildApiUrl(`/api/images/airquality/${data.th_dustboy_icon}.png?w=640`)}
                                                srcSet={`
                                                    ${buildApiUrl(`/api/images/airquality/${data.th_dustboy_icon}.png?w=320`)} 320w,
                                                    ${buildApiUrl(`/api/images/airquality/${data.th_dustboy_icon}.png?w=480`)} 480w,
                                                    ${buildApiUrl(`/api/images/airquality/${data.th_dustboy_icon}.png?w=640`)} 640w
                                                `}
                                                sizes="(max-width: 768px) 150px, (max-width: 1024px) 200px, 250px"
                                                alt={level.label}
                                                className="w-[110%] h-[110%] object-contain drop-shadow-2xl z-20 group-hover/box:drop-shadow-[0_20px_40px_rgba(0,0,0,0.15)] transition-[filter] duration-700"
                                                onError={() => setImgError(true)}
                                            />
                                        ) : (
                                            <i className={`fa-solid ${level.icon} text-[5rem] drop-shadow-2xl z-20`} style={{ color: level.accentColor }}></i>
                                        )}
                                    </div>
                                </div>

                                {/* Status Badge inside center column - Styled as a sharp pill */}
                                <div
                                    className="px-6 py-2 rounded-full text-xs lg:text-sm font-semibold shadow-sm border relative z-10 text-center transform-gpu max-w-[95%] backdrop-blur-md"
                                    style={{
                                        backgroundColor: level.badgeBg || '#ffffff',
                                        color: level.badgeText || level.accentColor,
                                        borderColor: level.badgeText !== '#ffffff' ? level.badgeBg : 'rgba(255,255,255,0.4)',
                                        WebkitTransform: 'translateZ(0)', backfaceVisibility: 'hidden'
                                    }}
                                >
                                    {data.th_title || level.label}
                                </div>
                            </div>

                            {/* Column 3: Hourly Chart */}
                            {history.length > 0 && (
                                <div className="h-28 sm:h-32 lg:h-36 w-full flex flex-col justify-end pt-4 md:pt-0 pl-1 md:pl-2 order-3 border-t md:border-t-0 border-white/40">
                                    <div className="text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center justify-between text-slate-800 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                                        <span>กราฟ 24 ชั่วโมง</span>
                                        <i className="fa-solid fa-chart-line opacity-70"></i>
                                    </div>
                                    <div className="flex-1 w-full h-[60px] sm:h-[80px] lg:h-[90px] relative">
                                        <div className="absolute inset-0">
                                            {isMounted && (
                                                <ResponsiveContainer width="99%" height="100%">
                                                    {/* Import YAxis, ReferenceLine, Cell, ComposedChart */}
                                                    <AreaChart data={history} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                                        <defs>
                                                            {/* Fill gradient ใช้สีจากระดับ AQI ปัจจุบัน */}
                                                            <linearGradient id="colorPm25" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor={level.accentColor} stopOpacity={0.3} />
                                                                <stop offset="95%" stopColor={level.accentColor} stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <Tooltip
                                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                                                            labelStyle={{ fontWeight: 'bold', color: '#64748b', fontSize: '11px', marginBottom: '4px' }}
                                                            itemStyle={{ fontWeight: '900', fontSize: '14px' }}
                                                            formatter={(value: number | undefined) => {
                                                                const v = value ?? 0
                                                                // ไฮไลต์เลข PM ด้วยสีตามเขต
                                                                const c = v <= 15 ? '#00BFF3' : v <= 25 ? '#00A651' : v <= 37.5 ? '#FDC04E' : v <= 75 ? '#F47920' : '#E3000F'
                                                                return [<span style={{ color: c, fontWeight: 900 }}>{v} µg/m³</span>, 'PM 2.5']
                                                            }}
                                                            labelFormatter={(_label, payload) => {
                                                                // แสดงวันที่และเวลาใน tooltip เพราะข้อมูลอาจข้ามวัน
                                                                if (!payload || payload.length === 0) return ''
                                                                const dt = payload[0]?.payload?.datetime
                                                                if (!dt) return `เวลา ${_label} น.`
                                                                const d = new Date(dt.replace(' ', 'T'))
                                                                return new Intl.DateTimeFormat('th-TH', {
                                                                    day: 'numeric', month: 'short',
                                                                    hour: '2-digit', minute: '2-digit'
                                                                }).format(d)
                                                            }}
                                                        />
                                                        <Area
                                                            type="monotone"
                                                            dataKey="pm25"
                                                            stroke={level.accentColor}
                                                            strokeWidth={2}
                                                            fillOpacity={1}
                                                            fill="url(#colorPm25)"
                                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                            dot={(props: any) => {
                                                                const { cx, cy, payload } = props
                                                                if (cx == null || cy == null) return <g />
                                                                const pm = payload?.pm25 ?? 0
                                                                const dotColor = pm <= 15 ? '#00BFF3' : pm <= 25 ? '#00A651' : pm <= 37.5 ? '#FDC04E' : pm <= 75 ? '#F47920' : '#E3000F'
                                                                return (
                                                                    <circle
                                                                        key={`dot-${cx}-${cy}`}
                                                                        cx={cx} cy={cy} r={3}
                                                                        fill={dotColor}
                                                                        stroke="white"
                                                                        strokeWidth={1.5}
                                                                    />
                                                                )
                                                            }}
                                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                            activeDot={(props: any) => {
                                                                const { cx, cy, payload } = props
                                                                if (cx == null || cy == null) return <g />
                                                                const pm = payload?.pm25 ?? 0
                                                                // สีวงกลม activeDot ตามค่า PM ของชั่วโมงที่ hover
                                                                const dotColor = pm <= 15 ? '#00BFF3' : pm <= 25 ? '#00A651' : pm <= 37.5 ? '#FDC04E' : pm <= 75 ? '#F47920' : '#E3000F'
                                                                return (
                                                                    <circle
                                                                        key={`active-${cx}-${cy}`}
                                                                        cx={cx} cy={cy} r={6}
                                                                        fill={dotColor}
                                                                        stroke="white"
                                                                        strokeWidth={2.5}
                                                                        style={{ filter: `drop-shadow(0 0 6px ${dotColor}80)` }}
                                                                    />
                                                                )
                                                            }}
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-between w-full mt-2 text-[10px] font-bold text-slate-800 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                                        {/* แสดงวันและเวลาของ data point แรกและสุดท้าย เพราะข้อมูลอาจข้ามวัน */}
                                        <span>
                                            {history[0]?.datetime
                                                ? new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(history[0].datetime.replace(' ', 'T')))
                                                : history[0]?.time}
                                        </span>
                                        <span>
                                            {history[history.length - 1]?.datetime
                                                ? new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(history[history.length - 1].datetime.replace(' ', 'T')))
                                                : history[history.length - 1]?.time}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bento Box 3: Weather (Only show if available) */}
                    {hasWeather && (
                        <div className="grid grid-cols-3 gap-3">
                            {(data.temp !== "" && data.temp != null) && (
                                <div className="col-span-1 bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-2 sm:p-3 flex flex-col items-center justify-center text-center group/stat hover:bg-white/80 transition-colors">
                                    <i className="fa-solid fa-temperature-three-quarters text-orange-400 text-base sm:text-xl mb-1 transition-transform duration-300 group-hover/stat:scale-110"></i>
                                    <span className="text-xs sm:text-sm font-black text-slate-700 tabular-nums">{data.temp}°C</span>
                                    <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">อุณหภูมิ</span>
                                </div>
                            )}
                            {(data.humid !== "" && data.humid != null) && (
                                <div className="col-span-1 bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-2 sm:p-3 flex flex-col items-center justify-center text-center group/stat hover:bg-white/80 transition-colors">
                                    <i className="fa-solid fa-droplet text-sky-400 text-base sm:text-xl mb-1 transition-transform duration-300 group-hover/stat:scale-110"></i>
                                    <span className="text-xs sm:text-sm font-black text-slate-700 tabular-nums">{data.humid}%</span>
                                    <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">ความชื้น</span>
                                </div>
                            )}
                            {((data.wind_speed !== "" && data.wind_speed != null) || (data.daily_wind_speed !== "" && data.daily_wind_speed != null)) && (
                                <div className="col-span-1 bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-2 sm:p-3 flex flex-col items-center justify-center text-center group/stat hover:bg-white/80 transition-colors">
                                    <i className="fa-solid fa-wind text-slate-400 text-base sm:text-xl mb-1 transition-transform duration-300 group-hover/stat:scale-110"></i>
                                    <span className="text-xs sm:text-sm font-black text-slate-700 tabular-nums">
                                        {data.wind_speed !== "" && data.wind_speed != null ? data.wind_speed : data.daily_wind_speed} <span className="text-[10px] font-bold">กม./ชม.</span>
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">ลม</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Bento Box 4: Health Tips */}
                    {(!hasWeather || data.th_caption) && (
                        <div className="bg-gradient-to-r from-emerald-50/80 to-teal-50/50 backdrop-blur-xl rounded-2xl border border-emerald-100/60 shadow-[0_4px_16px_rgba(16,185,129,0.04)] p-4 w-full flex items-center gap-3 transition-colors hover:from-emerald-50 hover:to-teal-50">
                            <div className="flex-shrink-0">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100/80 border border-emerald-200 shadow-sm flex items-center justify-center">
                                    <i className="fa-solid fa-leaf text-emerald-600 text-base"></i>
                                </div>
                            </div>
                            <div className="flex-1">
                                <h4 className="text-[11px] font-black text-emerald-700 uppercase tracking-widest mb-0.5">คำแนะนำสุขภาพ</h4>
                                <p className="text-xs font-semibold text-emerald-950/80 leading-relaxed max-h-16 overflow-y-auto pr-1 custom-scrollbar">
                                    {data.th_caption || 'ยังไม่มีข้อแนะนำเพิ่มเติมในขณะนี้'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
