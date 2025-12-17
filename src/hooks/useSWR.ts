import { useEffect, useRef, useState, useCallback } from 'react'

// Interface สำหรับ cache entry
interface CacheEntry<T> {
    data: T
    timestamp: number
    error?: Error
}

// Interface สำหรับ SWR options
interface SWROptions {
    revalidateOnFocus?: boolean
    revalidateOnReconnect?: boolean
    dedupingInterval?: number // milliseconds
    refreshInterval?: number // milliseconds
    staleTime?: number // milliseconds - เวลาที่ข้อมูลถือว่า "สด"
    cacheTime?: number // milliseconds - เวลาที่เก็บ cache
    onSuccess?: (data: unknown) => void
    onError?: (error: Error) => void
}

// Global cache สำหรับเก็บข้อมูล
const cache = new Map<string, CacheEntry<unknown>>()

// Global map สำหรับ track ongoing requests (deduplication)
const ongoingRequests = new Map<string, Promise<unknown>>()

/**
 * Custom hook สำหรับ data fetching พร้อม caching และ revalidation
 * ใช้ stale-while-revalidate strategy เพื่อแสดงข้อมูลเก่าก่อน แล้วค่อย update
 */
export function useSWR<T = unknown>(
    key: string | null,
    fetcher: () => Promise<T>,
    options: SWROptions = {}
) {
    const {
        revalidateOnFocus = false,
        revalidateOnReconnect = true,
        dedupingInterval = 2000, // 2 วินาที
        refreshInterval = 0,
        staleTime = 5000, // 5 วินาที - ข้อมูลถือว่าสดภายใน 5 วินาที
        cacheTime = 300000, // 5 นาที - เก็บ cache ไว้ 5 นาที
        onSuccess,
        onError,
    } = options

    const [data, setData] = useState<T | undefined>(() => {
        // ถ้ามี cache อยู่แล้ว ใช้เลย (stale-while-revalidate)
        if (key) {
            const cached = cache.get(key)
            if (cached && Date.now() - cached.timestamp < cacheTime) {
                return cached.data as T
            }
        }
        return undefined
    })

    const [error, setError] = useState<Error | undefined>()
    const [isValidating, setIsValidating] = useState(false)
    const mountedRef = useRef(true)
    const revalidateCountRef = useRef(0)

    // Function สำหรับ fetch ข้อมูล
    const fetchData = useCallback(
        async (force = false) => {
            if (!key) return

            // ตรวจสอบว่ามี cache ที่ยังสดอยู่หรือไม่
            const cached = cache.get(key)
            if (!force && cached && Date.now() - cached.timestamp < staleTime) {
                // ข้อมูลยังสด ไม่ต้อง fetch ใหม่
                return
            }

            // Request deduplication - ถ้ามี request เดียวกันกำลังทำงานอยู่ ใช้ตัวนั้นเลย
            if (ongoingRequests.has(key)) {
                try {
                    const result = await ongoingRequests.get(key)
                    if (mountedRef.current) {
                        setData(result as T)
                        setError(undefined)
                    }
                    return
                } catch (err) {
                    if (mountedRef.current) {
                        setError(err as Error)
                    }
                    return
                }
            }

            setIsValidating(true)

            // สร้าง request ใหม่
            const request = fetcher()
            ongoingRequests.set(key, request)

            try {
                const result = await request

                // เก็บลง cache
                cache.set(key, {
                    data: result,
                    timestamp: Date.now(),
                })

                if (mountedRef.current) {
                    setData(result)
                    setError(undefined)
                    onSuccess?.(result)
                }
            } catch (err) {
                const error = err as Error

                // เก็บ error ลง cache ด้วย
                cache.set(key, {
                    data: cached?.data, // เก็บข้อมูลเก่าไว้ถ้ามี
                    timestamp: Date.now(),
                    error,
                })

                if (mountedRef.current) {
                    setError(error)
                    onError?.(error)
                }
            } finally {
                ongoingRequests.delete(key)
                if (mountedRef.current) {
                    setIsValidating(false)
                }
            }
        },
        [key, fetcher, staleTime, onSuccess, onError]
    )

    // Initial fetch
    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Auto refresh interval
    useEffect(() => {
        if (!refreshInterval || refreshInterval <= 0) return

        const interval = setInterval(() => {
            fetchData()
        }, refreshInterval)

        return () => clearInterval(interval)
    }, [refreshInterval, fetchData])

    // Revalidate on focus
    useEffect(() => {
        if (!revalidateOnFocus) return

        const handleFocus = () => {
            // Debounce - ไม่ revalidate บ่อยเกินไป
            if (Date.now() - revalidateCountRef.current < dedupingInterval) return
            revalidateCountRef.current = Date.now()
            fetchData()
        }

        window.addEventListener('focus', handleFocus)
        return () => window.removeEventListener('focus', handleFocus)
    }, [revalidateOnFocus, dedupingInterval, fetchData])

    // Revalidate on reconnect
    useEffect(() => {
        if (!revalidateOnReconnect) return

        const handleOnline = () => {
            fetchData()
        }

        window.addEventListener('online', handleOnline)
        return () => window.removeEventListener('online', handleOnline)
    }, [revalidateOnReconnect, fetchData])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            mountedRef.current = false
        }
    }, [])

    return {
        data,
        error,
        isValidating,
        isLoading: !data && !error,
        mutate: fetchData, // Manual revalidation
    }
}

/**
 * Function สำหรับ clear cache
 */
export function clearCache(key?: string) {
    if (key) {
        cache.delete(key)
    } else {
        cache.clear()
    }
}

/**
 * Function สำหรับ prefetch ข้อมูล
 */
export async function prefetch<T>(key: string, fetcher: () => Promise<T>) {
    try {
        const data = await fetcher()
        cache.set(key, {
            data,
            timestamp: Date.now(),
        })
        return data
    } catch (error) {
        console.error('[useSWR] Prefetch failed:', error)
        throw error
    }
}
