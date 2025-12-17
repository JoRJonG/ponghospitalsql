import { createContext } from 'react'

export type Theme = 'light' | 'dark'
export type GrayscaleMode = 'force-on' | 'force-off'

export interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  isGrayscale: boolean
  grayscaleMode: GrayscaleMode
  refreshDisplayMode: () => Promise<void>
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)
