'use client'

import { useAuthStore } from '@/stores/authStore'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTheme } from '@/lib/ThemeContext'
import { GlobalSearch } from '@/components/ui/GlobalSearch'

const menuItems = [
  { icon: '⊞', label: 'داشبورد', path: '/dashboard' },
  { icon: '📅', label: 'جلسات', path: '/dashboard/meetings', badge: '۵' },
  { icon: '📋', label: 'گزارش‌ها', path: '/dashboard/reports', badge: '۱۲' },
  { icon: '📒', label: 'دفترچه تلفن', path: '/dashboard/phonebook' },
  { icon: '🔔', label: 'هشدارها', path: '/dashboard/alerts', badge: '۳' },
]

const bottomItems = [
  { icon: '👤', label: 'کاربران', path: '/dashboard/users' },
  { icon: '⚙️', label: 'تنظیمات', path: '/dashboard/settings' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const { isDark, toggleTheme, t } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) router.push('/')
  }, [isAuthenticated, router])

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) setSidebarOpen(false)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  if (!isAuthenticated) return null

  const NavItem = ({ item }: { item: typeof menuItems[0] }) => {
    const isActive = pathname === item.path
    return (
      <div
        onClick={() => { router.push(item.path); if (isMobile) setMobileMenuOpen(false) }}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
          background: isActive ? '#c9a84c22' : 'transparent',
          border: isActive ? '1px solid #c9a84c33' : '1px solid transparent',
          transition: 'all 0.2s', whiteSpace: 'nowrap', margin: '1px 0',
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = isDark ? '#ffffff08' : '#00000008' }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
      >
        <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
        {(sidebarOpen || isMobile) && (
          <>
            <span style={{ fontSize: '12px', fontWeight: isActive ? '600' : '400', color: isActive ? '#e8c96a' : t.sub, flex: 1 }}>
              {item.label}
            </span>
            {item.badge && (
              <span style={{ background: '#e05555', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '10px' }}>
                {item.badge}
              </span>
            )}
          </>
        )}
      </div>
    )
  }

  const SidebarContent = () => (
    <>
      {/* لوگو */}
      <div style={{ padding: '16px 14px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🏛️</div>
        {(sidebarOpen || isMobile) && (
          <div>
            <div style={{ color: '#e8c96a', fontSize: '11px', fontWeight: '700', lineHeight: '1.3' }}>وزارت آموزش</div>
            <div style={{ color: t.sub, fontSize: '10px' }}>معاونت متوسطه</div>
          </div>
        )}
      </div>

      {/* منوی اصلی */}
      <div style={{ flex: 1, padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {menuItems.map(item => <NavItem key={item.path} item={item} />)}
      </div>

      {/* منوی پایین */}
      <div style={{ padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {bottomItems.map(item => (
          <div key={item.path} onClick={() => router.push(item.path)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = isDark ? '#ffffff08' : '#00000008'}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
          >
            <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
            {(sidebarOpen || isMobile) && <span style={{ fontSize: '12px', color: t.muted }}>{item.label}</span>}
          </div>
        ))}

        {/* پروفایل */}
        <div
          onClick={() => router.push('/dashboard/profile')}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
            borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
            background: pathname === '/dashboard/profile' ? '#c9a84c22' : 'transparent',
            border: pathname === '/dashboard/profile' ? '1px solid #c9a84c33' : '1px solid transparent',
          }}
          onMouseEnter={e => { if (pathname !== '/dashboard/profile') (e.currentTarget as HTMLDivElement).style.background = isDark ? '#ffffff08' : '#00000008' }}
          onMouseLeave={e => { if (pathname !== '/dashboard/profile') (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
        >
          <span style={{ fontSize: '16px', flexShrink: 0 }}>🪪</span>
          {(sidebarOpen || isMobile) && (
            <span style={{ fontSize: '12px', color: pathname === '/dashboard/profile' ? '#e8c96a' : t.sub }}>پروفایل</span>
          )}
        </div>

        {/* dark/light */}
        <div
          onClick={toggleTheme}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', borderTop: `1px solid ${t.border}`, marginTop: '4px' }}
          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = isDark ? '#ffffff08' : '#00000008'}
          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
        >
          <span style={{ fontSize: '16px', flexShrink: 0 }}>{isDark ? '☀️' : '🌙'}</span>
          {(sidebarOpen || isMobile) && <span style={{ fontSize: '12px', color: t.sub }}>{isDark ? 'حالت روز' : 'حالت شب'}</span>}
        </div>

        {/* خروج */}
        <div
          onClick={() => { logout(); router.push('/') }}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', borderTop: `1px solid ${t.border}`, marginTop: '4px', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#e0555511'}
          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
        >
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#1a1200', flexShrink: 0 }}>
            {user?.name?.charAt(0)}
          </div>
          {(sidebarOpen || isMobile) && (
            <div>
              <div style={{ fontSize: '11px', color: t.text, fontWeight: '600' }}>{user?.name}</div>
              <div style={{ fontSize: '10px', color: '#e05555' }}>خروج</div>
            </div>
          )}
        </div>
      </div>
    </>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: t.bg, overflow: 'hidden', direction: 'rtl', transition: 'background 0.3s' }}>

      {/* سایدبار دسکتاپ */}
      {!isMobile && (
        <div style={{ width: sidebarOpen ? '220px' : '72px', background: t.card, borderLeft: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', transition: 'width 0.3s ease', overflow: 'hidden', flexShrink: 0 }}>
          <SidebarContent />
        </div>
      )}

      {/* منوی موبایل */}
      {isMobile && mobileMenuOpen && (
        <>
          <div onClick={() => setMobileMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: '#00000066', zIndex: 40 }} />
          <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '260px', background: t.card, borderLeft: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', zIndex: 50, animation: 'slideInRight 0.3s ease' }}>
            <SidebarContent />
          </div>
        </>
      )}

      {/* محتوا */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* تاپ‌بار */}
        <div style={{ height: '56px', background: t.card, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: '10px', flexShrink: 0, transition: 'background 0.3s' }}>

          <button
            onClick={() => isMobile ? setMobileMenuOpen(!mobileMenuOpen) : setSidebarOpen(!sidebarOpen)}
            style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '8px', width: '34px', height: '34px', cursor: 'pointer', color: t.sub, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}
          >☰</button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: t.text, fontSize: '14px', fontWeight: '600', transition: 'color 0.3s' }}>داشبورد اجرایی</div>
            {!isMobile && <div style={{ color: t.muted, fontSize: '11px' }}>معاونت آموزش متوسطه — وزارت آموزش و پرورش</div>}
          </div>

          {/* جستجوی کلی */}
          {!isMobile && <GlobalSearch />}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#3dbb8222', border: '1px solid #3dbb8244', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', color: '#3dbb82', flexShrink: 0 }}>
            <div className="pulse-dot"></div>
            {!isMobile && <span>اتصال زنده</span>}
          </div>

          <button onClick={toggleTheme} style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '8px', width: '34px', height: '34px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
            {isDark ? '☀️' : '🌙'}
          </button>

          <div style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
            <span style={{ fontSize: '18px' }}>🔔</span>
            <div style={{ position: 'absolute', top: '4px', left: '4px', width: '8px', height: '8px', borderRadius: '50%', background: '#e05555', border: `2px solid ${t.card}` }}></div>
          </div>
        </div>

        {/* صفحه */}
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '12px' : '20px', background: t.bg, transition: 'background 0.3s' }} className="animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  )
}