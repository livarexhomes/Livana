import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

const ThemeProviderContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
  resolvedDark: boolean
}>({
  theme: 'system',
  setTheme: () => {},
  toggleTheme: () => {},
  resolvedDark: false,
})

export const useTheme = () => useContext(ThemeProviderContext)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem('theme') as Theme | null
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
    } catch {}
    return 'system'
  })

  const getResolvedDark = (): boolean => {
    if (theme === 'light') return false
    if (theme === 'dark') return true
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  const [resolvedDark, setResolvedDark] = useState(getResolvedDark)

  useEffect(() => {
    const update = () => setResolvedDark(getResolvedDark())
    update()

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', update)
      return () => mq.removeEventListener('change', update)
    }
    return () => {}
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    if (resolvedDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [resolvedDark])

  const applyTheme = (t: Theme) => {
    setTheme(t)
    try {
      localStorage.setItem('theme', t)
    } catch {}
  }

  const toggleTheme = () => {
    applyTheme(resolvedDark ? 'light' : 'dark')
  }

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme: applyTheme, toggleTheme, resolvedDark }}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
