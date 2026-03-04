import useSWR from 'swr'
import { buildApiUrl } from '../utils/api'

export interface HistoryRecord {
    log_datetime: string
    pm25: number | null
}

const POLL_INTERVAL_MS = 60 * 60 * 1000 // เช็คใหม่ทุก 1 ชั่วโมง (Default สำหรับ history)

export function useAirQualityHistory() {
    const { data, error, isLoading } = useSWR<{ success: boolean, data: { value: HistoryRecord[] } }>(
        buildApiUrl('/api/airquality/history'),
        async (url) => {
            const res = await fetch(url)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const json = await res.json()
            if (json.success && Array.isArray(json.data?.value)) {
                return json
            }
            throw new Error('Invalid response')
        },
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 60000,
            refreshInterval: (currentData) => {
                const now = new Date()
                let delayToNextFetch = POLL_INTERVAL_MS

                const activeData = currentData?.data?.value
                if (activeData && activeData.length > 0) {
                    const latestRecord = activeData[0]
                    const dataTimeMs = new Date(latestRecord.log_datetime.replace(' ', 'T') + '+07:00').getTime()
                    const startOfCurrentHour = new Date(now)
                    startOfCurrentHour.setMinutes(0, 0, 0)

                    const hasLatestHourData = dataTimeMs >= startOfCurrentHour.getTime()

                    if (hasLatestHourData) {
                        const nextTarget = new Date(now)
                        nextTarget.setHours(now.getHours() + 1, 7, 30, 0)
                        delayToNextFetch = nextTarget.getTime() - now.getTime()
                    } else if (now.getMinutes() < 7) {
                        const nextTarget = new Date(now)
                        nextTarget.setHours(now.getHours(), 7, 30, 0)
                        delayToNextFetch = Math.max(nextTarget.getTime() - now.getTime(), 10000)
                    }
                }
                return Math.max(delayToNextFetch, 10000)
            }
        }
    )

    const history = data?.success ? (data.data?.value ?? []) : []

    return { data: history, loading: isLoading, error: !!error }
}
