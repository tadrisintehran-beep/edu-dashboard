import type { Metadata, Viewport } from 'next'
import { Vazirmatn } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/lib/ThemeContext'
import { QueryProvider } from '@/lib/QueryProvider'

const vazirmatn = Vazirmatn({
  subsets: ['arabic'],
  variable: '--font-vazirmatn',
  display: 'swap',
  preload: true,
})

export const metadata: Metadata = {
  title: {
    default: 'سامانه مدیریت معاونت آموزش متوسطه',
    template: '%s | معاونت آموزش متوسطه',
  },
  description: 'داشبورد اجرایی وزارت آموزش و پرورش — معاونت آموزش متوسطه',
  keywords: ['آموزش', 'وزارت', 'داشبورد', 'مدیریت'],
  authors: [{ name: 'وزارت آموزش و پرورش' }],
  robots: 'noindex, nofollow',
  manifest: '/manifest.json',
  icons: {
  icon: [
    { url: '/logo.png', type: 'image/png' },
  ],
  apple: '/logo.png',
  shortcut: '/logo.png',
},
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'داشبورد آموزش',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="font-vazirmatn antialiased">
        <ThemeProvider>
          <QueryProvider>
            {children}
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}