'use client'

import { useState } from 'react'
import { useTheme } from '@/lib/ThemeContext'
import { useToast } from '@/components/ui/Toast'
import { useIsMobile } from '@/lib/useIsMobile'

export default function SettingsPage() {
  const { t, isDark, toggleTheme } = useTheme()
  const { showToast, ToastComponent } = useToast()
  const isMobile = useIsMobile()

  const [notifications, setNotifications] = useState({
    newReport: true,
    newMeeting: true,
    criticalAlert: true,
    systemUpdate: false,
  })

  const [display, setDisplay] = useState({
    language: 'fa',
    dateFormat: 'jalali',
    density: 'normal',
  })

  const [security, setSecurity] = useState({
    sessionTimeout: '30',
    twoFactor: false,
  })

  const handleSave = (section: string) => {
    showToast(`تنظیمات ${section} با موفقیت ذخیره شد`, 'success')
  }

  const inputStyle = {
    width: '100%', background: t.input, border: `1px solid ${t.border}`,
    borderRadius: '8px', padding: '8px 12px', color: t.text,
    fontSize: '12px', outline: 'none', direction: 'rtl' as const, fontFamily: 'inherit',
  }

  const Toggle = ({ value, onChange }: { value: boolean, onChange: () => void }) => (
    <div
      onClick={onChange}
      style={{
        width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer',
        background: value ? '#c9a84c' : t.inner,
        border: `1px solid ${value ? '#c9a84c' : t.border}`,
        position: 'relative', transition: 'all 0.3s', flexShrink: 0,
      }}
    >
      <div style={{
        width: '18px', height: '18px', borderRadius: '50%',
        background: value ? '#1a1200' : t.muted,
        position: 'absolute', top: '2px',
        right: value ? '2px' : '22px',
        transition: 'all 0.3s',
      }} />
    </div>
  )

  const Section = ({ title, icon, children }: { title: string, icon: string, children: React.ReactNode }) => (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '14px', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '18px' }}>{icon}</span>
        <div style={{ color: t.text, fontSize: '14px', fontWeight: '600' }}>{title}</div>
      </div>
      <div style={{ padding: '16px 20px' }}>
        {children}
      </div>
    </div>
  )

  const Row = ({ label, desc, children }: { label: string, desc?: string, children: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '12px 0', borderBottom: `1px solid ${t.border}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ color: t.text, fontSize: '13px', fontWeight: '500' }}>{label}</div>
        {desc && <div style={{ color: t.muted, fontSize: '11px', marginTop: '2px' }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: isMobile ? '100%' : '680px' }}>

      <div>
        <h1 style={{ color: t.text, fontSize: isMobile ? '16px' : '18px', fontWeight: '700' }}>تنظیمات</h1>
        <p style={{ color: t.muted, fontSize: '12px', marginTop: '4px' }}>مدیریت تنظیمات سامانه</p>
      </div>

      {/* ظاهر */}
      <Section title="ظاهر و نمایش" icon="🎨">
        <Row label="حالت تاریک/روشن" desc="تغییر تم رنگی سامانه">
          <Toggle value={isDark} onChange={toggleTheme} />
        </Row>
        <Row label="زبان سامانه" desc="زبان نمایش محتوا">
          <select style={{ ...inputStyle, width: '120px' }} value={display.language} onChange={e => setDisplay(p => ({ ...p, language: e.target.value }))}>
            <option value="fa">فارسی</option>
            <option value="en">English</option>
          </select>
        </Row>
        <Row label="فرمت تاریخ" desc="نحوه نمایش تاریخ در سامانه">
          <select style={{ ...inputStyle, width: '120px' }} value={display.dateFormat} onChange={e => setDisplay(p => ({ ...p, dateFormat: e.target.value }))}>
            <option value="jalali">شمسی</option>
            <option value="gregorian">میلادی</option>
          </select>
        </Row>
        <Row label="تراکم نمایش" desc="فاصله بین المان‌های صفحه">
          <select style={{ ...inputStyle, width: '120px' }} value={display.density} onChange={e => setDisplay(p => ({ ...p, density: e.target.value }))}>
            <option value="compact">فشرده</option>
            <option value="normal">عادی</option>
            <option value="comfortable">راحت</option>
          </select>
        </Row>
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => handleSave('ظاهر')} className="btn-gold" style={{ padding: '8px 20px', fontSize: '12px' }}>ذخیره تغییرات</button>
        </div>
      </Section>

      {/* اعلان‌ها */}
      <Section title="اعلان‌ها" icon="🔔">
        <Row label="گزارش جدید" desc="اعلان هنگام دریافت گزارش جدید">
          <Toggle value={notifications.newReport} onChange={() => setNotifications(p => ({ ...p, newReport: !p.newReport }))} />
        </Row>
        <Row label="جلسه جدید" desc="اعلان هنگام ثبت جلسه جدید">
          <Toggle value={notifications.newMeeting} onChange={() => setNotifications(p => ({ ...p, newMeeting: !p.newMeeting }))} />
        </Row>
        <Row label="هشدار بحرانی" desc="اعلان فوری برای هشدارهای بحرانی">
          <Toggle value={notifications.criticalAlert} onChange={() => setNotifications(p => ({ ...p, criticalAlert: !p.criticalAlert }))} />
        </Row>
        <Row label="بروزرسانی سیستم" desc="اعلان هنگام بروزرسانی سامانه">
          <Toggle value={notifications.systemUpdate} onChange={() => setNotifications(p => ({ ...p, systemUpdate: !p.systemUpdate }))} />
        </Row>
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => handleSave('اعلان‌ها')} className="btn-gold" style={{ padding: '8px 20px', fontSize: '12px' }}>ذخیره تغییرات</button>
        </div>
      </Section>

      {/* امنیت */}
      <Section title="امنیت" icon="🔒">
        <Row label="مهلت نشست" desc="مدت زمان بعد از عدم فعالیت (دقیقه)">
          <select style={{ ...inputStyle, width: '120px' }} value={security.sessionTimeout} onChange={e => setSecurity(p => ({ ...p, sessionTimeout: e.target.value }))}>
            <option value="15">۱۵ دقیقه</option>
            <option value="30">۳۰ دقیقه</option>
            <option value="60">۱ ساعت</option>
            <option value="120">۲ ساعت</option>
          </select>
        </Row>
        <Row label="احراز هویت دو مرحله‌ای" desc="افزایش امنیت با کد تأیید">
          <Toggle value={security.twoFactor} onChange={() => setSecurity(p => ({ ...p, twoFactor: !p.twoFactor }))} />
        </Row>
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => handleSave('امنیت')} className="btn-gold" style={{ padding: '8px 20px', fontSize: '12px' }}>ذخیره تغییرات</button>
        </div>
      </Section>

      {/* درباره سامانه */}
      <Section title="درباره سامانه" icon="ℹ️">
        <Row label="نسخه سامانه" >
          <span style={{ color: t.text, fontSize: '12px', background: t.inner, padding: '4px 10px', borderRadius: '20px', border: `1px solid ${t.border}` }}>v1.0.0</span>
        </Row>
        <Row label="آخرین بروزرسانی">
          <span style={{ color: t.muted, fontSize: '12px' }}>۲۱ خرداد ۱۴۰۵</span>
        </Row>
        <Row label="توسعه‌دهنده">
          <span style={{ color: t.muted, fontSize: '12px' }}>معاونت آموزش متوسطه</span>
        </Row>
        <Row label="پشتیبانی">
          <a href="mailto:support@edu.ir" style={{ color: '#c9a84c', fontSize: '12px', textDecoration: 'none' }}>support@edu.ir</a>
        </Row>
      </Section>

      {/* دیتابیس */}
      <Section title="مدیریت داده" icon="🗄️">
        <Row label="پاکسازی cache" desc="حذف داده‌های موقت ذخیره شده">
          <button
            onClick={() => showToast('Cache با موفقیت پاک شد', 'success')}
            style={{ background: '#4a9eff22', border: '1px solid #4a9eff44', borderRadius: '8px', padding: '6px 14px', color: '#4a9eff', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
          >پاکسازی</button>
        </Row>
        <Row label="خروج از همه دستگاه‌ها" desc="پایان دادن به همه نشست‌های فعال">
          <button
            onClick={() => showToast('از همه دستگاه‌ها خارج شدید', 'info')}
            style={{ background: '#e0555522', border: '1px solid #e0555544', borderRadius: '8px', padding: '6px 14px', color: '#e05555', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
          >خروج همه</button>
        </Row>
      </Section>

      {ToastComponent}
    </div>
  )
}