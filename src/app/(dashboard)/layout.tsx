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
  { icon: '📁', label: 'اسناد', path: '/dashboard/documents' },
]

const bottomItems = [
  { icon: '👤', label: 'کاربران', path: '/dashboard/users' },
  { icon: '⚙️', label: 'تنظیمات', path: '/dashboard/settings' },
]

const pageTitle: Record<string, string> = {
  '/dashboard': 'داشبورد اجرایی',
  '/dashboard/meetings': 'مدیریت جلسات',
  '/dashboard/reports': 'سیستم گزارش‌ها',
  '/dashboard/phonebook': 'دفترچه تلفن',
  '/dashboard/alerts': 'سیستم هشدارها',
  '/dashboard/users': 'مدیریت کاربران',
  '/dashboard/profile': 'پروفایل کاربری',
  '/dashboard/settings': 'تنظیمات',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout, checkSession, isChecking } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const { isDark, toggleTheme, t } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showNotif, setShowNotif] = useState(false)

  useEffect(() => { checkSession() }, [])

  useEffect(() => {
    if (!isChecking && !isAuthenticated) router.push('/')
  }, [isAuthenticated, isChecking, router])

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

  useEffect(() => { setMobileMenuOpen(false) }, [pathname])

  if (isChecking) return (
    <div style={{ minHeight: '100vh', background: '#0c0e14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🏛️</div>
      <div style={{ color: '#c9a84c', fontSize: '13px' }}>در حال بارگذاری...</div>
    </div>
  )

  if (!isAuthenticated) return null

  const currentTitle = pageTitle[pathname] || 'داشبورد'

  const NavItem = ({ item }: { item: typeof menuItems[0] }) => {
    const isActive = pathname === item.path
    return (
      <div
        onClick={() => { router.push(item.path); if (isMobile) setMobileMenuOpen(false) }}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
          background: isActive ? '#c9a84c22' : 'transparent',
          border: isActive ? '1px solid #c9a84c44' : '1px solid transparent',
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
        <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0, boxShadow: '0 4px 12px #c9a84c44' }}>🏛️</div>
        {(sidebarOpen || isMobile) && (
          <div>
            <div style={{ color: '#e8c96a', fontSize: '11px', fontWeight: '700', lineHeight: '1.3' }}>وزارت آموزش</div>
            <div style={{ color: t.muted, fontSize: '10px' }}>معاونت متوسطه</div>
          </div>
        )}
      </div>

      {/* منوی اصلی */}
      <div style={{ flex: 1, padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {(sidebarOpen || isMobile) && (
          <div style={{ color: t.muted, fontSize: '10px', fontWeight: '600', padding: '8px 12px 4px', letterSpacing: '0.5px' }}>
            منوی اصلی
          </div>
        )}
        {menuItems.map(item => <NavItem key={item.path} item={item} />)}

        {(sidebarOpen || isMobile) && (
          <div style={{ color: t.muted, fontSize: '10px', fontWeight: '600', padding: '12px 12px 4px', letterSpacing: '0.5px', borderTop: `1px solid ${t.border}`, marginTop: '8px' }}>
            مدیریت
          </div>
        )}
        {!sidebarOpen && !isMobile && <div style={{ height: '12px' }} />}
        {bottomItems.map(item => (
          <div key={item.path} onClick={() => router.push(item.path)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
              borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
              background: pathname === item.path ? '#c9a84c22' : 'transparent',
              border: pathname === item.path ? '1px solid #c9a84c44' : '1px solid transparent',
            }}
            onMouseEnter={e => { if (pathname !== item.path) (e.currentTarget as HTMLDivElement).style.background = isDark ? '#ffffff08' : '#00000008' }}
            onMouseLeave={e => { if (pathname !== item.path) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
          >
            <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
            {(sidebarOpen || isMobile) && (
              <span style={{ fontSize: '12px', color: pathname === item.path ? '#e8c96a' : t.sub }}>{item.label}</span>
            )}
          </div>
        ))}
      </div>

      {/* پایین سایدبار */}
      <div style={{ padding: '8px', borderTop: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: '2px' }}>

        {/* پروفایل */}
        <div
          onClick={() => router.push('/dashboard/profile')}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
            borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
            background: pathname === '/dashboard/profile' ? '#c9a84c22' : 'transparent',
            border: pathname === '/dashboard/profile' ? '1px solid #c9a84c44' : '1px solid transparent',
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
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = isDark ? '#ffffff08' : '#00000008'}
          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
        >
          <span style={{ fontSize: '16px', flexShrink: 0 }}>{isDark ? '☀️' : '🌙'}</span>
          {(sidebarOpen || isMobile) && <span style={{ fontSize: '12px', color: t.sub }}>{isDark ? 'حالت روز' : 'حالت شب'}</span>}
        </div>

        {/* آواتار و خروج */}
        <div
          onClick={() => { logout(); router.push('/') }}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#e0555511'}
          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
        >
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#1a1200', flexShrink: 0, boxShadow: '0 2px 8px #c9a84c44' }}>
            {user?.name?.charAt(0)}
          </div>
          {(sidebarOpen || isMobile) && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', color: t.text, fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div style={{ fontSize: '10px', color: '#e05555' }}>خروج از سامانه</div>
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
        <div style={{ width: sidebarOpen ? '230px' : '72px', background: t.card, borderLeft: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', transition: 'width 0.3s ease', overflow: 'hidden', flexShrink: 0, boxShadow: isDark ? '4px 0 20px #00000033' : '4px 0 20px #00000011' }}>
          <SidebarContent />
        </div>
      )}

      {/* منوی موبایل */}
      {isMobile && mobileMenuOpen && (
        <>
          <div onClick={() => setMobileMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: '#00000077', zIndex: 40, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '270px', background: t.card, borderLeft: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', zIndex: 50, boxShadow: '-8px 0 32px #00000044', animation: 'slideInRight 0.25s ease' }}>
            <SidebarContent />
          </div>
        </>
      )}

      {/* محتوا */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* تاپ‌بار */}
        <div style={{ height: '60px', background: t.card, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: '12px', flexShrink: 0, transition: 'background 0.3s', boxShadow: isDark ? '0 2px 12px #00000033' : '0 2px 12px #00000011' }}>

          <button
            onClick={() => isMobile ? setMobileMenuOpen(!mobileMenuOpen) : setSidebarOpen(!sidebarOpen)}
            style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '10px', width: '36px', height: '36px', cursor: 'pointer', color: t.sub, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = '#c9a84c55'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = t.border}
          >☰</button>

          {/* عنوان صفحه */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: t.text, fontSize: '15px', fontWeight: '700', transition: 'color 0.3s' }}>{currentTitle}</div>
            {!isMobile && <div style={{ color: t.muted, fontSize: '11px' }}>معاونت آموزش متوسطه — وزارت آموزش و پرورش</div>}
          </div>

          {/* جستجو */}
          {!isMobile && <GlobalSearch />}

          {/* اتصال زنده */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#3dbb8222', border: '1px solid #3dbb8244', padding: '5px 12px', borderRadius: '20px', fontSize: '11px', color: '#3dbb82', flexShrink: 0 }}>
            <div className="pulse-dot"></div>
            {!isMobile && <span>اتصال زنده</span>}
          </div>

          {/* dark/light */}
          <button onClick={toggleTheme} style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '10px', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
            {isDark ? '☀️' : '🌙'}
          </button>

          {/* اعلان */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setShowNotif(!showNotif)}
              style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '10px', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
            >🔔</button>
            <div style={{ position: 'absolute', top: '6px', left: '6px', width: '8px', height: '8px', borderRadius: '50%', background: '#e05555', border: `2px solid ${t.card}` }}></div>

            {/* پنل اعلان */}
            {showNotif && (
              <>
                <div onClick={() => setShowNotif(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                <div style={{ position: 'absolute', top: '44px', left: '-180px', width: '240px', background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', zIndex: 50, boxShadow: '0 8px 32px #00000033', overflow: 'hidden', animation: 'fadeInUp 0.2s ease' }}>
                  <div style={{ padding: '12px 14px', borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: '12px', fontWeight: '600' }}>اعلان‌ها</div>
                  {[
                    { text: 'گزارش جدید دریافت شد', time: '۵ دقیقه پیش', icon: '📋', color: '#4a9eff' },
                    { text: 'جلسه ۱۵ دقیقه دیگر', time: '۱۵ دقیقه پیش', icon: '📅', color: '#c9a84c' },
                    { text: 'هشدار بحرانی جدید', time: '۱ ساعت پیش', icon: '🚨', color: '#e05555' },
                  ].map((notif, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: i < 2 ? `1px solid ${t.border}` : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = t.inner}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                    >
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: notif.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>{notif.icon}</div>
                      <div>
                        <div style={{ color: t.text, fontSize: '11px', fontWeight: '500' }}>{notif.text}</div>
                        <div style={{ color: t.muted, fontSize: '10px', marginTop: '2px' }}>{notif.time}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <a href="/dashboard/alerts" style={{ color: '#c9a84c', fontSize: '11px', textDecoration: 'none' }} onClick={() => setShowNotif(false)}>مشاهده همه →</a>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* آواتار */}
          <div
            onClick={() => router.push('/dashboard/profile')}
            style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#1a1200', cursor: 'pointer', flexShrink: 0, boxShadow: '0 2px 8px #c9a84c44', transition: 'transform 0.2s' }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.1)'}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'}
          >
            {user?.name?.charAt(0)}
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