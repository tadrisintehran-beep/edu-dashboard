'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface ThemeContextType {
  isDark: boolean
  toggleTheme: () => void
  t: {
    bg: string
    card: string
    inner: string
    border: string
    border2: string
    text: string
    sub: string
    muted: string
    input: string
    goldText: string
    blueText: string
    greenText: string
    redText: string
  }
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved) setIsDark(saved === 'dark')
  }, [])

  useEffect(() => {
    document.body.className = isDark ? '' : 'light'
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggleTheme = () => setIsDark(prev => !prev)

  const t = isDark ? {
    bg:      '#0c0e14',
    card:    '#131620',
    inner:   '#1a1e2c',
    border:  '#ffffff0f',
    border2: '#ffffff18',
    text:    '#e8eaf0',
    sub:     '#8b90a8',
    muted:   '#555c78',
    input:   '#1a1e2c',
    // در حالت تیره، رنگ‌های اصلی روی پس‌زمینه‌ی خیلی تیره کنتراست بالایی دارند — نیازی به رنگ جایگزین نیست
    goldText:  '#e8c96a',
    blueText:  '#4a9eff',
    greenText: '#3dbb82',
    redText:   '#e05555',
  } : {
    bg:      '#f0f2f8',
    card:    '#ffffff',
    inner:   '#f5f7ff',
    border:  '#e2e6f0',
    border2: '#d0d4e8',
    text:    '#1a1e2c',
    sub:     '#555c78',
    muted:   '#8b90a8',
    input:   '#eef0f8',
    // نسخه‌ی تیره‌تر رنگ‌های اصلی، مخصوص متن روی پس‌زمینه‌ی روشن — کنتراست WCAG AA (≥4.5:1) روی سفید
    goldText:  '#8a6a1a',
    blueText:  '#1f5fa8',
    greenText: '#1f7a52',
    redText:   '#b8362f',
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, t }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}