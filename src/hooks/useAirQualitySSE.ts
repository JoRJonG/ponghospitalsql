import { useEffect, useState, useCallback, useRef } from 'react'
import { buildApiUrl } from '../utils/api'

export interface AirQualityData {
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

const POLL_INTERVAL_MS = 5 * 60 * 1000 // เช็คใหม่ทุก 5 นาที (Default)

export function useAirQualitySSE() {
    // ชื่อ function เดิมเพื่อไม่ต้องไปแก้ Component อื่นๆ แต่ดึงข้อมูลแบบ API ปกติ
    const [data, setData] = useState<AirQualityData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    // ใช้ Ref เพื่อเก็บข้อมูลล่าสุดไว้ใช้ใน Effect อย่างปลอดภัย
    const dataRef = useRef(data)
    useEffect(() => {
        dataRef.current = data
    }, [data])

    const fetchAirQuality = useCallback(async () => {
        try {
            const res = await fetch(buildApiUrl('/api/airquality'))
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const json = await res.json()
            if (json.success && json.data) {
                setData(json.data)
                setError(false)
            } else {
                throw new Error('Invalid response')
            }
        } catch (err) {
            console.error('[AirQuality] Fetch error:', err)
            setData(prev => {
                if (!prev) setError(true)
                return prev
            })
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        let isMounted = true
        let timerId: ReturnType<typeof setTimeout> | null = null

        const scheduleNextFetch = () => {
            if (!isMounted) return

            const currentData = dataRef.current
            const now = new Date()
            let delayToNextFetch = POLL_INTERVAL_MS // Default 5 mins

            if (currentData?.log_datetime) {
                const dataTimeMs = new Date(currentData.log_datetime.replace(' ', 'T') + '+07:00').getTime()
                const startOfCurrentHour = new Date(now)
                startOfCurrentHour.setMinutes(0, 0, 0)

                const hasLatestHourData = dataTimeMs >= startOfCurrentHour.getTime()

                if (hasLatestHourData) {
                    // ถ้าได้ข้อมูลของชั่วโมงนี้แล้ว → หยุดดึง! 
                    // ตั้งเวลาให้ตื่นมาดึงอีกที "นาทีที่ 7.5 ของชั่วโมงถัดไป"
                    const nextTarget = new Date(now)
                    nextTarget.setHours(now.getHours() + 1, 7, 30, 0)
                    delayToNextFetch = nextTarget.getTime() - now.getTime()
                } else if (now.getMinutes() < 7) {
                    // ถ้ายัวไม่มีข้อมูลชั่วโมงนี้ แต่ยังไม่ถึงนาทีที่ 7 → รอถึงนาทีที่ 7.5 ค่อยดึงทีเดียว
                    const nextTarget = new Date(now)
                    nextTarget.setHours(now.getHours(), 7, 30, 0)
                    delayToNextFetch = Math.max(nextTarget.getTime() - now.getTime(), 10000) // รออย่างน้อย 10 วิ
                }
            }

            // ตั้งเวลา (Scheduling)
            if (timerId) clearTimeout(timerId)
            timerId = setTimeout(async () => {
                if (!isMounted) return
                await fetchAirQuality() // ไปดึง API
                scheduleNextFetch() // ดึงเสร็จ ตั้งเวลาดึงรอบถัดไป
            }, Math.max(delayToNextFetch, 10000))
        }

        // 1. ครั้งแรกที่เปิดหน้าเว็บ (Mount)
        fetchAirQuality().then(() => {
            scheduleNextFetch() // เริ่มลูปหลังดึงครั้งแรกเสร็จ
        })

        return () => {
            isMounted = false
            if (timerId) clearTimeout(timerId)
        }
    }, [fetchAirQuality])

    return { data, loading, error }
}
