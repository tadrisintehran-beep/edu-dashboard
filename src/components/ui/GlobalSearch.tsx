'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/lib/ThemeContext'
import { supabase } from '@/lib/supabase'

interface SearchResult {
  id: string
  title: string
  subtitle: string
  type: 'meeting' | 'report' | 'contact' | 'alert'
  path: string
}

const typeConfig = {
  meeting: { label: 'جلسه', icon: '📅', color: '#c9a84c' },
  report:  { label: 'گزارش', icon: '📋', color: '#4a9eff' },
  contact: { label: 'مخاطب', icon: '👤', color: '#3dbb82' },
  alert:   { label: 'هشدار', icon: '🔔', color: '#e05555' },
}

export function GlobalSearch() {
  const { t, isDark } = useTheme()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // باز شدن با Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(() => search(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const search = async (q: string) => {
    setLoading(true)
    const results: SearchResult[] = []

    const [meetings, reports, contacts, alerts] = await Promise.all([
      supabase.from('meetings').select('id, title_fa, location, status').ilike('title_fa', `%${q}%`).limit(3),
      supabase.from('reports').select('id, title_fa, author, status').ilike('title_fa', `%${q}%`).limit(3),
      supabase.from('contacts').select('id, name, position, organization').ilike('name', `%${q}%`).limit(3),
      supabase.from('alerts').select('id, title, level').ilike('title', `%${q}%`).limit(3),
    ])

    meetings.data?.forEach(m => results.push({
      id: m.id, title: m.title_fa,
      subtitle: `📍 ${m.location || '—'} | وضعیت: ${m.status}`,
      type: 'meeting', path: '/dashboard/meetings',
    }))

    reports.data?.forEach(r => results.push({
      id: r.id, title: r.title_fa,
      subtitle: `👤 ${r.author} | وضعیت: ${r.status}`,
      type: 'report', path: '/dashboard/reports',
    }))

    contacts.data?.forEach(c => results.push({
      id: c.id, title: c.name,
      subtitle: `${c.position || '—'} | ${c.organization || '—'}`,
      type: 'contact', path: '/dashboard/phonebook',
    }))

    alerts.data?.forEach(a => results.push({
      id: a.id, title: a.title,
      subtitle: `سطح: ${a.level}`,
      type: 'alert', path: '/dashboard/alerts',
    }))

    setResults(results)
    setLoading(false)
  }

  const handleSelect = (result: SearchResult) => {
    router.push(result.path)
    setOpen(false)
    setQuery('')
    setResults([])
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: t.inner, border: `1px solid ${t.border}`,
        borderRadius: '8px', padding: '6px 12px',
        color: t.muted, fontSize: '12px', cursor: 'pointer',
        fontFamily: 'inherit', transition: 'all 0.2s',
      }}
    >
      <span>🔍</span>
      <span>جستجو...</span>
      <span style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '4px', padding: '1px 5px', fontSize: '10px' }}>Ctrl+K</span>
    </button>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000077', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '80px', direction: 'rtl', backdropFilter: 'blur(4px)' }}
      onClick={() => setOpen(false)}>
      <div
        style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '14px', width: '100%', maxWidth: '520px', margin: '0 16px', boxShadow: '0 20px 60px #00000055', animation: 'fadeInUp 0.2s ease', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: `1px solid ${t.border}` }}>
          <span style={{ fontSize: '18px' }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="جستجو در جلسات، گزارش‌ها، مخاطبین..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: t.text, fontSize: '14px', direction: 'rtl', fontFamily: 'inherit' }}
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]) }}
              style={{ background: 'transparent', border: 'none', color: t.muted, cursor: 'pointer', fontSize: '16px' }}>✕</button>
          )}
          <button onClick={() => setOpen(false)}
            style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '3px 8px', color: t.muted, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>Esc</button>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: '20px', textAlign: 'center', color: t.muted, fontSize: '13px' }}>⏳ در حال جستجو...</div>
          )}

          {!loading && query && results.length === 0 && (
            <div style={{ padding: '30px', textAlign: 'center', color: t.muted, fontSize: '13px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
              نتیجه‌ای یافت نشد
            </div>
          )}

          {!loading && !query && (
            <div style={{ padding: '20px', textAlign: 'center', color: t.muted, fontSize: '12px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⌨️</div>
              برای جستجو تایپ کنید
            </div>
          )}

          {results.length > 0 && (
            <div style={{ padding: '8px' }}>
              {/* گروه‌بندی نتایج */}
              {(['meeting', 'report', 'contact', 'alert'] as const).map(type => {
                const typeResults = results.filter(r => r.type === type)
                if (typeResults.length === 0) return null
                const cfg = typeConfig[type]
                return (
                  <div key={type} style={{ marginBottom: '8px' }}>
                    <div style={{ color: t.muted, fontSize: '10px', fontWeight: '600', padding: '4px 8px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>{cfg.icon}</span>
                      <span>{cfg.label}ها</span>
                    </div>
                    {typeResults.map(result => (
                      <div
                        key={result.id}
                        onClick={() => handleSelect(result)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = isDark ? '#ffffff0a' : '#00000008'}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                      >
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: cfg.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                          {cfg.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: t.text, fontSize: '13px', fontWeight: '500', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.title}</div>
                          <div style={{ color: t.muted, fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.subtitle}</div>
                        </div>
                        <div style={{ color: t.muted, fontSize: '11px', flexShrink: 0 }}>→</div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 16px', borderTop: `1px solid ${t.border}`, display: 'flex', gap: '16px' }}>
          <span style={{ color: t.muted, fontSize: '11px' }}>↵ انتخاب</span>
          <span style={{ color: t.muted, fontSize: '11px' }}>Esc بستن</span>
          <span style={{ color: t.muted, fontSize: '11px' }}>Ctrl+K باز کردن</span>
        </div>
      </div>
    </div>
  )
}