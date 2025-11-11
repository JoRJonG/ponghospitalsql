import { useContext } from 'react'
import { HomepageRefreshContext } from './HomepageRefreshContextBase'

export function useHomepageRefresh() {
  const context = useContext(HomepageRefreshContext)
  if (context === undefined) {
    throw new Error('useHomepageRefresh must be used within a HomepageRefreshProvider')
  }
  return context
}
