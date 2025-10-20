import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { buildApiUrl } from '../utils/api'

type AuthContextType = {
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  getToken: () => string | null
  refreshToken: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize from localStorage synchronously so refresh doesn't cause a false redirect
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('ph_admin_token'))
  })

  const logout = useCallback(async () => {
    try {
      await fetch(buildApiUrl('/api/auth/logout'), {
        method: 'POST',
        credentials: 'include'
      })
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem('ph_admin_token')
    setIsAuthenticated(false)
  }, [])

  // Keep auth state in sync across tabs/windows
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'ph_admin_token') {
        setIsAuthenticated(Boolean(e.newValue))
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Listen for logout events from api.ts
  useEffect(() => {
    const onLogout = () => {
      logout()
    }
    window.addEventListener('auth:logout', onLogout)
    return () => window.removeEventListener('auth:logout', onLogout)
  }, [logout])

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const r = await fetch(buildApiUrl('/api/auth/refresh'), {
        method: 'POST',
        credentials: 'include' // Include cookies for refresh token
      })
      if (!r.ok) {
        logout() // Clear state if refresh fails
        return false
      }
      const data = await r.json() as { token: string }
      localStorage.setItem('ph_admin_token', data.token)
      setIsAuthenticated(true)
      return true
    } catch {
      logout()
      return false
    }
  }, [logout])

  // Auto-refresh token every 10 minutes (before 15min expiry)
  useEffect(() => {
    if (!isAuthenticated) return

    const interval = setInterval(async () => {
      await refreshToken()
    }, 10 * 60 * 1000) // 10 minutes

    return () => clearInterval(interval)
  }, [isAuthenticated, refreshToken])

  const login = async (username: string, password: string) => {
    try {
      const r = await fetch(buildApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies
        body: JSON.stringify({ username, password })
      })
      if (!r.ok) return false
      const data = await r.json() as { token: string }
      localStorage.setItem('ph_admin_token', data.token)
      setIsAuthenticated(true)
      return true
    } catch {
      return false
    }
  }
  const getToken = () => localStorage.getItem('ph_admin_token')
  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, getToken, refreshToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
