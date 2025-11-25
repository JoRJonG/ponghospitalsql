import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { buildApiUrl } from '../utils/api'

type AuthUser = {
  username: string
  roles: string[]
  permissions: string[]
}

type AuthContextType = {
  isAuthenticated: boolean
  user: AuthUser | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  getToken: () => string | null
  refreshToken: () => Promise<boolean>
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize from localStorage synchronously so refresh doesn't cause a false redirect
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem('ph_admin_token'))
    } catch (error) {
      console.warn('[auth] read token failed', error)
      return false
    }
  })

  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem('ph_admin_user')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed.username === 'string') {
        const roles = Array.isArray(parsed.roles) ? parsed.roles : []
        const permissions = Array.isArray(parsed.permissions) ? parsed.permissions : []
        return { username: parsed.username, roles, permissions }
      }
    } catch (error) {
      console.warn('[auth] read user from storage failed', error)
    }
    return null
  })

  const logout = useCallback(async () => {
    try {
      await fetch(buildApiUrl('/api/auth/logout'), {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.warn('[auth] logout request failed', error)
    }
    localStorage.removeItem('ph_admin_token')
    localStorage.removeItem('ph_admin_user')
    setIsAuthenticated(false)
    setUser(null)
  }, [])

  // Keep auth state in sync across tabs/windows
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'ph_admin_token') {
        setIsAuthenticated(Boolean(e.newValue))
      }
      if (e.key === 'ph_admin_user') {
        try {
          if (e.newValue) {
            const parsed = JSON.parse(e.newValue)
            if (parsed && typeof parsed.username === 'string') {
              const roles = Array.isArray(parsed.roles) ? parsed.roles : []
              const permissions = Array.isArray(parsed.permissions) ? parsed.permissions : []
              setUser({ username: parsed.username, roles, permissions })
              return
            }
          }
        } catch (error) {
          console.warn('[auth] sync user from storage failed', error)
        }
        setUser(null)
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
      const data = await r.json() as { token: string; user?: AuthUser }
      localStorage.setItem('ph_admin_token', data.token)
      setIsAuthenticated(true)
      if (data.user) {
        const payload = {
          username: data.user.username,
          roles: Array.isArray(data.user.roles) ? data.user.roles : [],
          permissions: Array.isArray(data.user.permissions) ? data.user.permissions : [],
        }
        localStorage.setItem('ph_admin_user', JSON.stringify(payload))
        setUser(payload)
      } else {
        localStorage.removeItem('ph_admin_user')
        setUser(null)
      }
      return true
    } catch (error) {
      console.warn('[auth] refresh token failed', error)
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
  const data = await r.json() as { token: string; user?: AuthUser }
      localStorage.setItem('ph_admin_token', data.token)
      setIsAuthenticated(true)
      if (data.user) {
        const payload = {
          username: data.user.username,
          roles: Array.isArray(data.user.roles) ? data.user.roles : [],
          permissions: Array.isArray(data.user.permissions) ? data.user.permissions : [],
        }
        localStorage.setItem('ph_admin_user', JSON.stringify(payload))
        setUser(payload)
      } else {
        localStorage.removeItem('ph_admin_user')
        setUser(null)
      }
      return true
    } catch (error) {
      console.warn('[auth] login failed', error)
      return false
    }
  }
  const getToken = () => localStorage.getItem('ph_admin_token')

  const hasPermission = useCallback((permission: string) => {
    if (!permission || !user) return false

    const permissions = Array.isArray(user.permissions) ? user.permissions : []
    const roles = Array.isArray(user.roles) ? user.roles : []

    if (permission === 'system') {
      if (roles.includes('admin')) return true
      return permissions.includes('system') || permissions.includes('*')
    }

    if (roles.includes('admin')) return true

    if (permissions.includes('*')) return true
    return permissions.includes(permission)
  }, [user])

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, getToken, refreshToken, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
