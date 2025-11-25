import { createContext } from 'react'

export interface HomepageRefreshContextType {
  refreshKey: number
  triggerRefresh: () => void
}

export const HomepageRefreshContext = createContext<HomepageRefreshContextType | undefined>(undefined)
