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

    const fetchAirQuality = useCallback(async (isBackground = false) => {
        try {
            // ถ้าเรียกจาก background (visibilitychange) ให้ fetch ใหม่เฉพาะเมื่อ
            // ผ่านมานานกว่า 55 นาทีจาก fetch ล่าสุด (data อัพเดทรายชั่วโมง)
            if (isBackground && Date.now() - lastFetchedRef.current < 55 * 60 * 1000) return
            // แสดง loading เฉพาะตอนที่ยังไม่มีข้อมูลเลย (โหลดครั้งแรก)
            if (!data) setLoading(true)
            setError(false)
            setImgError(false)

            const [res, historyRes] = await Promise.all([
                fetch(buildApiUrl('/api/airquality')),
                fetch(buildApiUrl('/api/airquality/history'))
            ])

            if (!res.ok) throw new Error('API error')
            const json = await res.json()
            if (json.success && json.data) {
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
                    const chartData = todaysData.map((item: { log_datetime: string; pm25: number }) => ({
                        // เก็บเวลา HH:MM สำหรับใช้ใน tooltip
                        time: item.log_datetime.split(' ')[1].substring(0, 5),
                        // เก็บ datetime เต็มสำหรับ label แกน X ที่ข้ามวัน
                        datetime: item.log_datetime,
                        pm25: item.pm25
                    }))
                    setHistory(chartData)
                }
            }

        } catch {
            setError(true)
        } finally {
            lastFetchedRef.current = Date.now()
            setLoading(false)
        }
    }, [data])

    useEffect(() => {
        fetchAirQuality()

        let intervalId: ReturnType<typeof setInterval> | null = null

        // คำนวณมิลลิวินาทีที่เหลือถึงชั่วโมงถัดไป เช่น เข้า 16:37 → รอ 23 นาที
        const msUntilNextHour = () => {
            const now = new Date()
            const next = new Date(now)
            next.setHours(now.getHours() + 1, 0, 0, 0) // ชั่วโมงถัดไป นาที:วินาที = 00:00
            return next.getTime() - now.getTime()
        }

        // setTimeout แรก: รอถึงชั่วโมงถัดไป แล้วค่อยตั้ง interval ทุก 1 ชม.
        const timeoutId = setTimeout(() => {
            if (document.visibilityState === 'visible') fetchAirQuality()
            // หลังจาก sync แล้ว ตั้ง interval ทุก 60 นาทีพอดี
            intervalId = setInterval(() => {
                if (document.visibilityState === 'visible') fetchAirQuality()
            }, 60 * 60 * 1000)
        }, msUntilNextHour())

        // fetch เมื่อ user กลับมาที่ tab แต่ต้องนานกว่า 5 นาทีจาก fetch ล่าสุดก่อน
        const onVisible = () => {
            if (document.visibilityState === 'visible') fetchAirQuality(true)
        }
        document.addEventListener('visibilitychange', onVisible)

        return () => {
            clearTimeout(timeoutId)
            if (intervalId) clearInterval(intervalId)
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
                    <div className="h-32 bg-slate-50 rounded-[2rem]" />
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
            <div className="relative rounded-[2.5rem] bg-white/50 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-white/60 overflow-hidden flex flex-col transition-all duration-700 p-4 sm:p-6 lg:p-8">

                {/* Top Control Bar */}
                <div className="flex justify-between items-center w-full mb-6 relative z-20">
                    <div className="inline-flex items-center gap-2.5 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-white/80 shrink-0">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-location-dot text-slate-600 text-[10px]"></i>
                        </div>
                        <span className="font-extrabold text-slate-700 text-[13px] tracking-wide whitespace-nowrap">จุดตรวจวัดฝุ่น PM 2.5 โรงพยาบาลปง</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 text-slate-500 bg-white/40 px-3 py-1.5 rounded-full border border-white/40">
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

                {/* ── Bento Grid Layout ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-6 relative z-10 w-full h-full">

                    {/* Bento Box 1: Avatar (Spans Left 4 cols on large screens) */}
                    <div className="lg:col-span-4 bg-white/60 backdrop-blur-2xl rounded-[2rem] border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-6 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden group/box hover:bg-white/70 transition-colors">
                        {/* Dynamic background glow inside box */}
                        <div
                            className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 transition-opacity duration-700 group-hover/box:opacity-40"
                            style={{ background: level.accentColor }}
                        ></div>

                        {/* Avatar */}
                        <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center mb-6 transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/box:-translate-y-2">
                            <div
                                className="absolute -bottom-2 w-2/3 h-6 rounded-[100%] blur-xl opacity-60 transition-all duration-700 group-hover/box:scale-75"
                                style={{ background: level.accentColor }}
                            ></div>
                            <div
                                className="absolute inset-0 rounded-full blur-2xl opacity-40 group-hover/box:opacity-70 transition-opacity duration-700"
                                style={{ background: level.gradient }}
                            ></div>

                            <div className="relative w-full h-full rounded-[2rem] rotate-3 group-hover/box:rotate-0 transition-transform duration-700 bg-white/90 backdrop-blur-xl border-2 border-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col items-center justify-center">
                                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
                                {data.th_dustboy_icon && !imgError ? (
                                    <img
                                        src={`https://www.cmuccdc.org/template/image/${data.th_dustboy_icon}.svg`}
                                        alt={level.label}
                                        className="w-[85%] h-[85%] object-contain drop-shadow-md transition-transform duration-700 ease-out group-hover/box:scale-110"
                                        onError={() => setImgError(true)}
                                    />
                                ) : (
                                    <i className={`fa-solid ${level.icon} text-[4rem] drop-shadow-sm`} style={{ color: level.accentColor }}></i>
                                )}
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div
                            className="px-5 py-2.5 rounded-xl text-[13px] font-black shadow-sm tracking-widest border border-white/60 backdrop-blur-md relative z-10 w-full text-center"
                            style={{ backgroundColor: level.badgeBg, color: level.badgeText }}
                        >
                            {data.th_title || level.label}
                        </div>
                    </div>

                    {/* Bento Box 2 & 3 wrapper for layout flow */}
                    <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 w-full">

                        {/* Bento Box 2: Giant Data Display & Hourly Chart */}
                        <div className="md:col-span-2 bg-gradient-to-br from-white/80 to-white/50 backdrop-blur-2xl rounded-[2rem] border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 sm:p-8 flex flex-col justify-center relative overflow-hidden group/box hover:shadow-[0_8px_32px_rgba(0,0,0,0.05)] transition-shadow">
                            <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ background: level.accentColor }}></div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center w-full relative z-10">
                                {/* Left: Big Number */}
                                <div className="flex flex-col">
                                    <div className="inline-flex items-center gap-2 mb-4">
                                        <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: level.accentColor }}></span>
                                        <h3 className="text-xs font-extrabold text-slate-500 tracking-[0.2em] uppercase">
                                            ปริมาณฝุ่นละออง PM 2.5
                                        </h3>
                                    </div>

                                    <div className="flex flex-wrap items-baseline gap-3 group/number cursor-default">
                                        <span
                                            className="text-8xl lg:text-[7.5rem] font-black tabular-nums leading-none tracking-tighter drop-shadow-sm transition-transform duration-500 group-hover/number:scale-105 origin-left"
                                            style={{ color: level.accentColor }}
                                        >
                                            {pm25Raw}
                                        </span>
                                        <div className="flex flex-col items-start justify-end pb-2 lg:pb-4">
                                            <span className="text-2xl lg:text-3xl font-extrabold text-slate-400">
                                                µg/m³
                                            </span>
                                            <span className="text-xs font-bold text-slate-400/80 tracking-wide mt-1">
                                                (ค่าเฉลี่ยรายชั่วโมง)
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Hourly Chart */}
                                {history.length > 0 && (
                                    <div className="h-32 sm:h-40 w-full flex flex-col justify-end border-t lg:border-t-0 lg:border-l border-slate-200/50 pt-6 lg:pt-0 lg:pl-8 mt-4 lg:mt-0">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                                            <span>24 ชั่วโมงที่ผ่านมา</span>
                                            <i className="fa-solid fa-chart-line text-slate-300"></i>
                                        </div>
                                        <div className="flex-1 w-full min-h-[100px]">
                                            <ResponsiveContainer width="100%" height="100%">
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
                                        </div>
                                        <div className="flex justify-between w-full mt-2 text-[9px] font-semibold text-slate-400/70">
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
                            <div className="md:col-span-2 grid grid-cols-3 gap-4">
                                {(data.temp !== "" && data.temp != null) && (
                                    <div className="col-span-1 bg-white/60 backdrop-blur-xl rounded-[1.5rem] border border-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-4 sm:p-5 flex flex-col items-center justify-center text-center group/stat hover:bg-white/80 transition-colors">
                                        <i className="fa-solid fa-temperature-three-quarters text-orange-400 text-lg sm:text-2xl mb-2 transition-transform duration-300 group-hover/stat:scale-110"></i>
                                        <span className="text-sm sm:text-base font-black text-slate-700 tabular-nums">{data.temp}°C</span>
                                        <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-1">อุณหภูมิ</span>
                                    </div>
                                )}
                                {(data.humid !== "" && data.humid != null) && (
                                    <div className="col-span-1 bg-white/60 backdrop-blur-xl rounded-[1.5rem] border border-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-4 sm:p-5 flex flex-col items-center justify-center text-center group/stat hover:bg-white/80 transition-colors">
                                        <i className="fa-solid fa-droplet text-sky-400 text-lg sm:text-2xl mb-2 transition-transform duration-300 group-hover/stat:scale-110"></i>
                                        <span className="text-sm sm:text-base font-black text-slate-700 tabular-nums">{data.humid}%</span>
                                        <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-1">ความชื้น</span>
                                    </div>
                                )}
                                {((data.wind_speed !== "" && data.wind_speed != null) || (data.daily_wind_speed !== "" && data.daily_wind_speed != null)) && (
                                    <div className="col-span-1 bg-white/60 backdrop-blur-xl rounded-[1.5rem] border border-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-4 sm:p-5 flex flex-col items-center justify-center text-center group/stat hover:bg-white/80 transition-colors">
                                        <i className="fa-solid fa-wind text-slate-400 text-lg sm:text-2xl mb-2 transition-transform duration-300 group-hover/stat:scale-110"></i>
                                        <span className="text-sm sm:text-base font-black text-slate-700 tabular-nums">
                                            {data.wind_speed !== "" && data.wind_speed != null ? data.wind_speed : data.daily_wind_speed} <span className="text-xs font-bold">กม./ชม.</span>
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-1">ความเร็วลม</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Bento Box 4: Health Tips */}
                        {(!hasWeather || data.th_caption) && (
                            <div className="md:col-span-2 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 backdrop-blur-xl rounded-[1.5rem] border border-emerald-100/60 shadow-[0_4px_16px_rgba(16,185,129,0.04)] p-5 sm:p-6 w-full flex items-center lg:items-start gap-4 transition-colors hover:from-emerald-50 hover:to-teal-50">
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 rounded-[1rem] bg-emerald-100/80 border border-emerald-200 shadow-sm flex items-center justify-center">
                                        <i className="fa-solid fa-leaf text-emerald-600 text-lg"></i>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-xs sm:text-[13px] font-black text-emerald-700 uppercase tracking-widest mb-1">คำแนะนำดูแลสุขภาพ</h4>
                                    <p className="text-[13px] sm:text-sm font-semibold text-emerald-950/80 leading-relaxed">
                                        {data.th_caption || 'ยังไม่มีข้อแนะนำเพิ่มเติมในขณะนี้'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    )
}
