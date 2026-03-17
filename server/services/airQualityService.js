import axios from 'axios'
import axiosRetry from 'axios-retry'

// Configure Axios instance with retry logic and reasonable timeouts
const apiClient = axios.create({
    baseURL: 'https://open-api.cmuccdc.org/api/dustboy',
    timeout: 10000, // 10 seconds timeout for standard requests
})

// Configure retry strategy:
// Retries on 5xx errors or network glitches (e.g. ECONNRESET)
// Exponential backoff: 1st retry = ~1s, 2nd = ~2s, 3rd = ~4s
axiosRetry(apiClient, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
        // Retry on network errors or 5xx server errors
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
            (error.response && error.response.status >= 500)
    },
    onRetry: (retryCount, error, requestConfig) => {
        const url = requestConfig.url
        console.warn(`[AirQualityService] Retry attempt ${retryCount} for ${url}. Reason: ${error.message}`)
    }
})

/**
 * Air Quality Service for fetching and processing CMU CCDC DustBoy data.
 */
class AirQualityService {

    constructor() {
        this.apiKey = process.env.DUSTBOY_API_KEY
    }

    /**
     * Helper to get the API Key safely
     */
    getApiKey() {
        this.apiKey = this.apiKey || process.env.DUSTBOY_API_KEY
        if (!this.apiKey) {
            const err = new Error('DUSTBOY_API_KEY is not configured in environment variables')
            // ใส่ flag เพื่อให้ router รู้ว่าเป็นปัญหาชั่วคราว/ระดับ API ต้อง fallback ไปใช้ cache
            err.isDustboyApiError = true
            throw err
        }
        return this.apiKey
    }

    /**
     * Fetch current air quality data for the main Pong Hospital station.
     * Updated: Now calculates custom daily averages based on records since 00:00 today.
     */
    async fetchCurrentStationData() {
        const apiKey = this.getApiKey()
        const url = '/station'

        const response = await apiClient.get(url, {
            params: { apikey: apiKey }
        })
        const data = response.data

        // Handle API-level errors
        if (data && typeof data === 'object' && !Array.isArray(data) && data.status === false) {
            const apiError = new Error(data.error || 'DustBoy API returned status: false')
            apiError.isDustboyApiError = true
            throw apiError
        }

        const station = Array.isArray(data)
            ? data.find(s => s.dustboy_uri === 'ponghos') || data[0]
            : data

        if (!station) {
            throw new Error('ไม่พบข้อมูลสถานี รพ.ปง จากระบบ DUSTBOY')
        }

        // Custom Daily Calculation: Calculate average from 00:00 today until now
        let customDailyPM25 = station.daily_pm25
        let customDailyPM10 = station.daily_pm10

        try {
            const history = await this.fetchHistoryData('5049')
            if (history && history.value && history.value.length > 0) {
                const now = new Date()
                // กำหนดเวลา 00:00 ของวันนี้เป็นเขตกั้น (Cutoff)
                const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

                // กรองเฉพาะข้อมูลที่เวลาที่บวก 1 ชม. แล้วยังอยู่ในวันนี้
                const todayRecords = history.value.filter(item => {
                    const itemTimeMs = new Date(item.log_datetime.replace(' ', 'T') + '+07:00').getTime() + (60 * 60 * 1000)
                    return itemTimeMs >= startOfToday && itemTimeMs <= now.getTime()
                })

                if (todayRecords.length > 0) {
                    const sum25 = todayRecords.reduce((acc, cur) => acc + (cur.pm25 || 0), 0)
                    customDailyPM25 = Math.round((sum25 / todayRecords.length) * 100) / 100

                    const sum10 = todayRecords.reduce((acc, cur) => acc + (cur.pm10 || 0), 0)
                    customDailyPM10 = Math.round((sum10 / todayRecords.length) * 100) / 100
                }
            }
        } catch (e) {
            console.error('[AirQualityService] Custom daily calculation failed, falling back to API values:', e.message)
        }

        return {
            dustboy_name: station.dustboy_name,
            pm25: station.pm25,
            pm10: station.pm10,
            us_aqi: station.us_aqi,
            us_color: station.us_color,
            us_title: station.us_title,
            us_dustboy_icon: station.us_dustboy_icon,
            th_aqi: station.th_aqi,
            th_color: station.th_color,
            th_title: station.th_title,
            th_caption: station.th_caption,
            th_dustboy_icon: station.th_dustboy_icon,
            daily_pm25: customDailyPM25, // ใช้ค่าที่คำนวณใหม่
            daily_pm10: customDailyPM10, // ใช้ค่าที่คำนวณใหม่
            daily_th_aqi: station.daily_th_aqi,
            daily_th_title: station.daily_th_title,
            daily_th_color: station.daily_th_color,
            log_datetime: station.log_datetime,
            temp: station.temp,
            humid: station.humid,
            wind_speed: station.wind_speed,
            daily_wind_speed: station.daily_wind_speed
        }
    }

    /**
     * Fetch 30-day historical data tailored down to the last 24 hours for the chart.
     * @param {string} stationId - Default is '5049' for Pong Hospital
     */
    async fetchHistoryData(stationId = '5049') {
        const apiKey = this.getApiKey()
        const url = `/data30day/${stationId}`

        const response = await apiClient.get(url, {
            params: { apikey: apiKey }
        })
        const data = response.data

        // Handle API-level errors: DustBoy returns HTTP 200 with {status:false, error:"..."}
        if (data && typeof data === 'object' && data.status === false) {
            const apiError = new Error(data.error || 'DustBoy API returned status: false')
            apiError.isDustboyApiError = true
            throw apiError
        }

        if (!data || !Array.isArray(data.value) || data.value.length === 0) {
            return { value: [] }
        }

        // Process Data: Parse down to 24 hours of needed fields for the UI graph
        // CMU API returns newest data at index 0
        const latestTimeStr = data.value[0].log_datetime.replace(' ', 'T') + '+07:00'
        const latestTimeMs = new Date(latestTimeStr).getTime() + (60 * 60 * 1000)
        const cutoffTimeMs = latestTimeMs - (24 * 60 * 60 * 1000)

        const filteredRecords = data.value.filter(item => {
            const itemTimeMs = new Date(item.log_datetime.replace(' ', 'T') + '+07:00').getTime() + (60 * 60 * 1000)
            return itemTimeMs >= cutoffTimeMs
        })

        const trimmedValues = filteredRecords.map(item => ({
            log_datetime: item.log_datetime,
            pm25: item.pm25,
            pm10: item.pm10
        }))

        return { value: trimmedValues }
    }
}

export const airQualityService = new AirQualityService()
