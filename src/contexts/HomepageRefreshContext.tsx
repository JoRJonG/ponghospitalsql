import { createContext, useContext, useState, useCallback } from 'react'
import { invalidateCache } from '../utils/fastFetch'
import type { ReactNode } from 'react'

interface HomepageRefreshContextType {
  refreshKey: number
  triggerRefresh: () => void
}

const HomepageRefreshContext = createContext<HomepageRefreshContextType | undefined>(undefined)

export function HomepageRefreshProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0)

  const triggerRefresh = useCallback(() => {
    try {
      invalidateCache('/api/activities')
    } catch {}
    setRefreshKey(prev => prev + 1)
  }, [])

  return (
    <HomepageRefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </HomepageRefreshContext.Provider>
  )
}

export function useHomepageRefresh() {
  const context = useContext(HomepageRefreshContext)
  if (context === undefined) {
    throw new Error('useHomepageRefresh must be used within a HomepageRefreshProvider')
  }
  return context
}