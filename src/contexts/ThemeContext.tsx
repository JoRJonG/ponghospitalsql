import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { buildApiUrl } from '../utils/api'

type Theme = 'light' | 'dark'
export type GrayscaleMode = 'force-on' | 'force-off'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  isGrayscale: boolean
  grayscaleMode: GrayscaleMode
  refreshDisplayMode: () => Promise<void>
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'theme'
const DEFAULT_DISPLAY_MODE: GrayscaleMode = 'force-off'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
      if (saved === 'light' || saved === 'dark') {
        return saved
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } catch (error) {
      return 'light'
    }
  })

  const [grayscaleMode, setGrayscaleMode] = useState<GrayscaleMode>(DEFAULT_DISPLAY_MODE)

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch (error) {}
  }, [theme])

  const effectiveGrayscale = useMemo(() => grayscaleMode === 'force-on', [grayscaleMode])

  useEffect(() => {
    const root = window.document.documentElement
    if (effectiveGrayscale) {
      root.classList.add('grayscale-mode')
    } else {
      root.classList.remove('grayscale-mode')
    }
  }, [effectiveGrayscale])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const refreshDisplayMode = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl('/api/system/display-mode'), {
        cache: 'no-store'
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const payload = await response.json().catch(() => null)
      const incoming = typeof payload?.data?.mode === 'string' ? payload.data.mode : null
      if (incoming === 'force-on' || incoming === 'force-off') {
        setGrayscaleMode(incoming)
      } else {
        setGrayscaleMode(DEFAULT_DISPLAY_MODE)
      }
    } catch (error) {
      setGrayscaleMode(DEFAULT_DISPLAY_MODE)
    }
  }, [])

  useEffect(() => {
    refreshDisplayMode()
  }, [refreshDisplayMode])

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        isGrayscale: effectiveGrayscale,
        grayscaleMode,
        refreshDisplayMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}