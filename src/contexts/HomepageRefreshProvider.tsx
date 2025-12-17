import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { HomepageRefreshContext } from './HomepageRefreshContextBase'
import { invalidateCache } from '../utils/fastFetch'

export function HomepageRefreshProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0)

  const triggerRefresh = useCallback(() => {
    try {
      invalidateCache('/api/activities')
    } catch (error) {
      console.error('Failed to invalidate activities cache', error)
    }
    setRefreshKey(prev => prev + 1)
  }, [])

  const value = useMemo(() => ({ refreshKey, triggerRefresh }), [refreshKey, triggerRefresh])

  return (
    <HomepageRefreshContext.Provider value={value}>
      {children}
    </HomepageRefreshContext.Provider>
  )
}
