import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
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
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [imgError, setImgError] = useState(false)
    // เก็บเวลาที่ fetch ครั้งล่าสุด เพื่อ debounce เมื่อกลับมา tab
    const lastFetchedRef = useRef<number>(0)
    // ใช้ ref แทน state เพื่อตรวจสอบว่ามีข้อมูลแล้วหรือยัง
    // (ถ้าใช้ state `data` โดยตรงใน useCallback จะเกิด infinite loop)
    const hasDataRef = useRef(false)
    // เก็บข้อมูลเวลาของข้อมูลล่าสุดที่ได้จาก API
    const latestLogRef = useRef<Date | null>(null)

    const fetchAirQuality = useCallback(async () => {
        try {
            // แสดง loading เฉพาะตอนที่ยังไม่มีข้อมูลเลย (โหลดครั้งแรก)
            if (!hasDataRef.current) setLoading(true)
            setError(false)
            setImgError(false)

            const res = await fetch(buildApiUrl(`/api/airquality`))

            if (!res.ok) throw new Error('API error')
            const json = await res.json()
            if (json.success && json.data) {
                hasDataRef.current = true // บอกว่ามีข้อมูลแล้ว ไม่ต้องแสดง loading อีก
                setData(json.data)
                if (json.data.log_datetime) {
                    // แปลงโดยเพิ่มออฟเซ็ต timezone ไทยเพื่อป้องกันปัญหาในบาง Browser (Safari)
                    latestLogRef.current = new Date(json.data.log_datetime.replace(' ', 'T') + '+07:00')
                }
            } else {
                throw new Error('Invalid data')
            }

        } catch {
            setError(true)
        } finally {
            lastFetchedRef.current = Date.now()
            setLoading(false)
        }
    }, []) // ไม่มี dependency — ใช้ ref แทน state เพื่อป้องกัน infinite loop

    useEffect(() => {
        let isMounted = true
        let timeoutId: ReturnType<typeof setTimeout>

        // ฟังก์ชันดึงข้อมูลและตั้งเวลาเรียกซ้ำ
        const runPoller = async () => {
            if (!isMounted) return

            // ดึงข้อมูลถ้าหน้าเว็บถูกเปิดอยู่
            if (document.visibilityState === 'visible') {
                await fetchAirQuality()
            }

            if (!isMounted) return
            scheduleNext()
        }

        const scheduleNext = () => {
            const now = new Date()
            const currentHour = now.getHours()
            const logDate = latestLogRef.current

            // เช็คว่า ข้อมูลล่าสุดอยู่ในชั่วโมงปัจจุบันของเครื่องผู้ใช้ หรือผ่านเข้าชั่วโมงใหม่มาแล้วใช่หรือไม่ 
            // วิธีชัวร์ที่สุดคือกำหนด "เวลาเริ่มต้นของชั่วโมงปัจจุบัน"
            const startOfCurrentHour = new Date(now)
            startOfCurrentHour.setMinutes(0, 0, 0)

            // ถ้าข้อมูลที่ได้มามี timestamp ตั้งแต่นาทีที่ 0 ของชั่วโมงปัจจุบันขึ้นไป = ไดัข้อมูลชั่วโมงนี้มาแล้ว
            const hasCurrentHourData = logDate ? logDate.getTime() >= startOfCurrentHour.getTime() : false

            let delay: number

            if (hasCurrentHourData) {
                // ทันทีที่ได้ข้อมูลของชั่วโมงปัจจุบันมาแล้ว ให้หลับยาวไปจนกว่า "นาทีที่ 7 ของชั่วโมงถัดไป"
                const nextHour = new Date(now)
                nextHour.setHours(currentHour + 1, 7, 0, 0)
                delay = nextHour.getTime() - now.getTime()
            } else {
                // ถ้ายังไม่ได้ข้อมูลของชั่วโมงปัจจุบัน หรือเซิร์ฟเวอร์ยังส่งของเก่ามาให้
                if (now.getMinutes() < 7) {
                    // ถ้ายังไม่ถึงนาทีที่ 7 ของชั่วโมงปัจจุบัน ให้รอไปเช็คครัังแรกตอนนาทีที่ 7 เป๊ะๆ
                    const target = new Date(now)
                    target.setHours(currentHour, 7, 0, 0)
                    delay = target.getTime() - now.getTime()
                } else {
                    // ถ้าเลยนาทีที่ 7 มาแล้ว แต่ข้อมูลยังไม่อัพเดท ให้รีเฟรชถามอีกทีใน 3 นาที!
                    // วนลูปตามจิกทุก 3 นาทีไปเรื่อยๆ จนกว่าจะได้ชั่วโมงปัจจุบัน (hasCurrentHourData = true)
                    delay = 3 * 60 * 1000
                }
            }

            // ตั้งขั้นต่ำไว้ 5 วินาที เผื่อเบราว์เซอร์คำนวณเวลาติดลบ จะได้ไม่เกิดลูปหยุดไม่อยู่
            timeoutId = setTimeout(runPoller, Math.max(delay, 5000))
        }

        // เริ่มต้นการดึงข้อมูลครั้งแรก
        runPoller()

        // fetch ใหม่เมื่อผู้ใช้กลับมาที่ tab
        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                const now = new Date()
                const logDate = latestLogRef.current

                const startOfCurrentHour = new Date(now)
                startOfCurrentHour.setMinutes(0, 0, 0)
                const hasCurrentHourData = logDate ? logDate.getTime() >= startOfCurrentHour.getTime() : false

                // ถ้ากลับมาเปิดแท็บ แล้วปรากฎว่ายังไม่ได้ข้อมูลชั่วโมงนี้ และไม่ได้พึ่งโหลดไปเมื่อ 1 นาทีที่ผ่านมา ให้ดึงใหม่เลย
                if (!hasCurrentHourData && Date.now() - lastFetchedRef.current >= 60 * 1000) {
                    clearTimeout(timeoutId)
                    runPoller()
                }
            }
        }

        document.addEventListener('visibilitychange', onVisible)

        return () => {
            isMounted = false
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
                            onClick={() => fetchAirQuality()}
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
                                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: level.accentColor }}></span>
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

                {/* Bottom Section: Weather, Health Tip */}
                {(hasWeather || data.th_caption) && (
                    <div className="flex flex-col sm:flex-row items-center justify-between sm:justify-start w-full px-4 sm:px-5 py-2.5 text-[10px] sm:text-[11px] font-bold text-slate-500 border-t border-slate-50 bg-slate-50/50 z-10 bg-inherit">
                        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                            {(data.temp !== "" && data.temp != null) && (
                                <span className="flex items-center gap-1.5"><i className="fa-solid fa-temperature-three-quarters text-orange-400"></i> {data.temp}°</span>
                            )}
                            {(data.humid !== "" && data.humid != null) && (
                                <span className="flex items-center gap-1.5"><i className="fa-solid fa-droplet text-sky-400"></i> {data.humid}%</span>
                            )}
                        </div>

                        {data.th_caption && (
                            <div className="flex items-center gap-1.5 max-w-full text-emerald-600/90 truncate sm:ml-4 mt-1 sm:mt-0" title={data.th_caption}>
                                <i className="fa-solid fa-notes-medical shrink-0"></i>
                                <span className="truncate">{data.th_caption}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
