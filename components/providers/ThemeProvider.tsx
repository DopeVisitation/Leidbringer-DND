'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

interface ThemeContextValue {
  theme: string
  accent: string
  setTheme: (t: string) => void
  setAccent: (a: string) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark', accent: 'amber',
  setTheme: () => {}, setAccent: () => {},
})

export function useTheme() { return useContext(ThemeContext) }

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState('dark')
  const [accent, setAccentState] = useState('amber')

  // Apply to DOM
  const apply = useCallback((t: string, a: string) => {
    const html = document.documentElement
    html.setAttribute('data-theme', t)
    html.setAttribute('data-accent', a)
    if (t === 'light') html.classList.remove('dark')
    else html.classList.add('dark')
  }, [])

  useEffect(() => {
    const t = localStorage.getItem('dnd-theme') ?? 'dark'
    const a = localStorage.getItem('dnd-accent') ?? 'amber'
    setThemeState(t)
    setAccentState(a)
    apply(t, a)
  }, [apply])

  const setTheme = useCallback((t: string) => {
    setThemeState(t)
    localStorage.setItem('dnd-theme', t)
    apply(t, accent)
  }, [accent, apply])

  const setAccent = useCallback((a: string) => {
    setAccentState(a)
    localStorage.setItem('dnd-accent', a)
    apply(theme, a)
  }, [theme, apply])

  return (
    <ThemeContext.Provider value={{ theme, accent, setTheme, setAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}
