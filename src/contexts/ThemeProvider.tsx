import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { buildApiUrl } from '../utils/api'
import { ThemeContext } from './ThemeContextBase'
import type { Theme, GrayscaleMode } from './ThemeContextBase'

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
		} catch {
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
		} catch (error) {
			console.error('Failed to persist theme preference', error)
		}
	}, [theme])

	const isGrayscale = useMemo(() => grayscaleMode === 'force-on', [grayscaleMode])

	useEffect(() => {
		const root = window.document.documentElement
		if (isGrayscale) {
			root.classList.add('grayscale-mode')
		} else {
			root.classList.remove('grayscale-mode')
		}
	}, [isGrayscale])

	const toggleTheme = useCallback(() => {
		setTheme(prev => prev === 'light' ? 'dark' : 'light')
	}, [])

	const refreshDisplayMode = useCallback(async () => {
		try {
			const response = await fetch(buildApiUrl('/api/system/display-mode'), {
				cache: 'no-store',
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
			console.error('Failed to refresh display mode', error)
			setGrayscaleMode(DEFAULT_DISPLAY_MODE)
		}
	}, [])

	useEffect(() => {
		refreshDisplayMode()
	}, [refreshDisplayMode])

	const value = useMemo(() => ({
		theme,
		toggleTheme,
		isGrayscale,
		grayscaleMode,
		refreshDisplayMode,
	}), [grayscaleMode, isGrayscale, refreshDisplayMode, theme, toggleTheme])

	return (
		<ThemeContext.Provider value={value}>
			{children}
		</ThemeContext.Provider>
	)
}
