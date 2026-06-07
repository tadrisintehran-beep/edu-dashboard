'use client'

import { useAuthStore } from '@/stores/authStore'
import { useTheme } from '@/lib/ThemeContext'

const kpiData = [
  { label: 'درخواست های تایید', value: '۲۳', delta: '↑ ۸ نسبت به دیروز', deltaType: 'down', icon: '⭐', color: '#c9a84c' },
  { label: 'جلسات این هفته', value: '۱۱', delta: '↑ ۳ افزایش', deltaType: 'up', icon: '📅', color: '#4a9eff' },
  { label: 'گزارش های دریافتی', value: '۴۷', delta: '↑ ۱۲ نسبت به هفته گذشته', deltaType: 'up', icon: '📋', color: '#3dbb82' },
  { label: 'هشدارهای فعال', value: '۳', delta: '⚠ نیاز به بررسی فوری', deltaType: 'down', icon: '🔔', color: '#e05555' },
]

const agenda = [
  { time: '۰۸:۳۰', title: 'جلسه شورای مدیران', sub: 'اتاق کنفرانس A — ۸ نفر', priority: 'high' },
  { time: '۱۰:۰۰', title: 'بررسی طرح ارزیابی', sub: 'آنلاین — ۵ نفر', priority: 'med' },
  { time: '۱۳:۰۰', title: 'هماهنگی بودجه سالانه', sub: 'اتاق مالی — ۳ نفر', priority: 'low' },
  { time: '۱۵:۳۰', title: 'گزارش به وزیر', sub: 'وزارتخانه — فوری', priority: 'high' },
]

const activities = [
  { color: '#3dbb82', text: 'احمد رضایی گزارش ارزیابی فصل دوم را ارسال کرد', time: '۵ دقیقه' },
  { color: '#c9a84c', text: 'مریم صادقی درخواست تخصیص بودجه ثبت کرد', time: '۱۸ دقیقه' },
  { color: '#4a9eff', text: 'جلسه شورای هماهنگی تایید شد', time: '۴۵ دقیقه' },
  { color: '#e05555', text: 'هشدار: ۳ پرونده منقضی بدون رسیدگی', time: '۱ ساعت' },
  { color: '#8b6fdb', text: 'گزارش استانی اصفهان آماده بررسی است', time: '۲ ساعت' },
]

const priorityColor: Record<string, string> = {
  high: '#e05555', med: '#c9a84c', low: '#4a9eff',
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { t } = useTheme()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      <div>
        <h1 style={{ color: t.text, fontSize: '18px', fontWeight: '700' }}>
          سلام، {user?.name} 👋
        </h1>
        <p style={{ color: t.muted, fontSize: '12px', marginTop: '4px' }}>
          چهارشنبه، ۱۵ خرداد ۱۴۰۳ — دفتر تهران
        </p>
      </div>

      {/* KPI Cards */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {kpiData.map((kpi, i) => (
          <div key={i} className="hover-card" style={{
            background: t.card, border: `1px solid ${t.border}`,
            borderRadius: '12px', padding: '16px', cursor: 'pointer',
          }}>
            <div style={{ marginBottom: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: kpi.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                {kpi.icon}
              </div>
            </div>
            <div style={{ color: t.sub, fontSize: '11px', marginBottom: '6px' }}>{kpi.label}</div>
            <div style={{ color: t.text, fontSize: '24px', fontWeight: '700', marginBottom: '6px' }}>{kpi.value}</div>
            <div style={{ fontSize: '11px', color: kpi.deltaType === 'up' ? '#3dbb82' : '#e05555' }}>{kpi.delta}</div>
          </div>
        ))}
      </div>

      {/* ردیف دوم */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '12px' }}>

        {/* فعالیت‌ها */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ color: t.text, fontSize: '13px', fontWeight: '600' }}>فعالیت های اخیر</div>
            <div style={{ color: '#c9a84c', fontSize: '11px', cursor: 'pointer' }}>همه →</div>
          </div>
          <div className="stagger">
            {activities.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 0', borderBottom: i < activities.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: a.color, flexShrink: 0, marginTop: '4px' }}></div>
                <div style={{ flex: 1, fontSize: '12px', color: t.sub, lineHeight: '1.5' }}>{a.text}</div>
                <div style={{ fontSize: '10px', color: t.muted, flexShrink: 0 }}>{a.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* برنامه امروز */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ color: t.text, fontSize: '13px', fontWeight: '600' }}>برنامه امروز</div>
            <div style={{ background: t.inner, border: `1px solid ${t.border}`, padding: '3px 8px', borderRadius: '10px', fontSize: '10px', color: t.muted }}>۱۵ خرداد</div>
          </div>
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {agenda.map((item, i) => (
              <div key={i} className="hover-card" style={{ padding: '10px 12px', borderRadius: '8px', borderRight: `3px solid ${priorityColor[item.priority]}`, background: t.inner, cursor: 'pointer' }}>
                <div style={{ color: t.muted, fontSize: '10px', marginBottom: '3px' }}>{item.time}</div>
                <div style={{ color: t.text, fontSize: '12px', fontWeight: '600' }}>{item.title}</div>
                <div style={{ color: t.sub, fontSize: '10px', marginTop: '2px' }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* وضعیت استان‌ها */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px' }}>
        <div style={{ color: t.text, fontSize: '13px', fontWeight: '600', marginBottom: '14px' }}>وضعیت استان ها</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[
            { value: '۲۸', label: 'استان فعال', color: '#3dbb82' },
            { value: '۴', label: 'گزارش ناقص', color: '#e09444' },
            { value: '۳', label: 'نیاز به بررسی', color: '#e05555' },
          ].map((item, i) => (
            <div key={i} style={{ background: t.inner, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <div style={{ color: item.color, fontSize: '28px', fontWeight: '700' }}>{item.value}</div>
              <div style={{ color: t.muted, fontSize: '11px', marginTop: '4px' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}