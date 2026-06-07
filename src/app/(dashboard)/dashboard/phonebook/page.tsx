'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/lib/ThemeContext'
import { supabase } from '@/lib/supabase'

const provinces = ['همه', 'تهران', 'اصفهان', 'مازندران', 'خراسان رضوی', 'فارس', 'آذربایجان شرقی']

const tagColors: Record<string, string> = {
  'مدیر': '#c9a84c', 'معاون': '#4a9eff', 'کارشناس': '#3dbb82', 'رئیس': '#8b6fdb',
}
const avatarColors = ['#c9a84c', '#4a9eff', '#3dbb82', '#e05555', '#8b6fdb', '#e09444', '#2ec4a8', '#e05599']

export default function PhonebookPage() {
  const { t } = useTheme()
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [province, setProvince] = useState('همه')
  const [showFavorites, setShowFavorites] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<any | null>(null)
  const [newContact, setNewContact] = useState({
    name: '', position: '', organization: '', province: 'تهران', phone: '', email: '', tag: 'کارشناس',
  })

  useEffect(() => { fetchContacts() }, [])

  const fetchContacts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setContacts(data)
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!newContact.name || !newContact.phone) return
    const initials = newContact.name.split(' ').map((w: string) => w[0]).join('.')
    const { error } = await supabase.from('contacts').insert([{
      ...newContact,
      avatar: initials,
      favorite: false,
    }])
    if (!error) {
      fetchContacts()
      setNewContact({ name: '', position: '', organization: '', province: 'تهران', phone: '', email: '', tag: 'کارشناس' })
      setShowForm(false)
    }
  }

  const toggleFavorite = async (id: string, current: boolean) => {
    await supabase.from('contacts').update({ favorite: !current }).eq('id', id)
    fetchContacts()
    if (selected?.id === id) setSelected((prev: any) => prev ? { ...prev, favorite: !current } : null)
  }

  const filtered = contacts.filter(c => {
    const matchSearch = c.name?.includes(search) || c.organization?.includes(search) || c.position?.includes(search)
    const matchProvince = province === 'همه' || c.province === province
    const matchFav = !showFavorites || c.favorite
    return matchSearch && matchProvince && matchFav
  })

  const inputStyle = {
    width: '100%', background: t.input, border: `1px solid ${t.border}`,
    borderRadius: '8px', padding: '8px 12px', color: t.text,
    fontSize: '12px', outline: 'none', direction: 'rtl' as const, fontFamily: 'inherit',
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: t.sub, fontSize: '13px' }}>
      ⏳ در حال بارگذاری...
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: t.text, fontSize: '18px', fontWeight: '700' }}>دفترچه تلفن</h1>
          <p style={{ color: t.muted, fontSize: '12px', marginTop: '4px' }}>{contacts.length} مخاطب ثبت شده</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold">+ مخاطب جدید</button>
      </div>

      {showForm && (
        <div style={{ background: t.card, border: '1px solid #c9a84c33', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#e8c96a', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>افزودن مخاطب جدید</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            {[
              { label: 'نام و نام خانوادگی', key: 'name', placeholder: 'نام کامل' },
              { label: 'سمت', key: 'position', placeholder: 'سمت سازمانی' },
              { label: 'سازمان', key: 'organization', placeholder: 'نام سازمان' },
              { label: 'شماره تلفن', key: 'phone', placeholder: '۰۲۱-۸۸۴۴۵۵۶۶' },
              { label: 'ایمیل', key: 'email', placeholder: 'email@edu.ir' },
            ].map(field => (
              <div key={field.key}>
                <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>{field.label}</label>
                <input style={inputStyle} placeholder={field.placeholder}
                  value={newContact[field.key as keyof typeof newContact]}
                  onChange={e => setNewContact(p => ({ ...p, [field.key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>استان</label>
              <select style={inputStyle} value={newContact.province} onChange={e => setNewContact(p => ({ ...p, province: e.target.value }))}>
                {provinces.filter(p => p !== 'همه').map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', padding: '8px 16px', color: t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>انصراف</button>
            <button onClick={handleAdd} className="btn-gold" style={{ padding: '8px 16px', fontSize: '12px' }}>ذخیره</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input style={{ ...inputStyle, flex: 1 }} placeholder="🔍 جستجو بر اساس نام، سازمان یا سمت..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...inputStyle, width: 'auto' }} value={province} onChange={e => setProvince(e.target.value)}>
          {provinces.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div onClick={() => setShowFavorites(!showFavorites)} style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', background: showFavorites ? '#c9a84c22' : t.card, border: showFavorites ? '1px solid #c9a84c44' : `1px solid ${t.border}`, color: showFavorites ? '#e8c96a' : t.sub }}>
          ⭐ موردعلاقه‌ها
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 320px' : '1fr', gap: '12px' }}>

        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
          {filtered.map((contact, i) => (
            <div key={contact.id} className="hover-card" onClick={() => setSelected(contact)}
              style={{ background: selected?.id === contact.id ? t.inner : t.card, border: `1px solid ${selected?.id === contact.id ? '#c9a84c33' : t.border}`, borderRadius: '12px', padding: '14px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0, background: avatarColors[i % avatarColors.length] + '33', border: '2px solid ' + avatarColors[i % avatarColors.length] + '55', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: avatarColors[i % avatarColors.length] }}>
                  {contact.avatar}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: t.text, fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>{contact.name}</div>
                  <div style={{ color: t.sub, fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.position}</div>
                </div>
                <div onClick={e => { e.stopPropagation(); toggleFavorite(contact.id, contact.favorite) }}
                  style={{ fontSize: '16px', cursor: 'pointer', opacity: contact.favorite ? 1 : 0.3 }}>⭐</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: t.muted, fontSize: '11px' }}>📍 {contact.province}</div>
                <div style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600', background: (tagColors[contact.tag] || '#555') + '22', color: tagColors[contact.tag] || t.sub }}>
                  {contact.tag}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '40px', textAlign: 'center', color: t.muted, fontSize: '13px' }}>مخاطبی یافت نشد</div>
          )}
        </div>

        {selected && (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ color: t.text, fontSize: '13px', fontWeight: '600' }}>اطلاعات مخاطب</div>
              <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', color: t.muted, fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 10px', background: '#c9a84c33', border: '2px solid #c9a84c55', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: '#c9a84c' }}>
                {selected.avatar}
              </div>
              <div style={{ color: t.text, fontSize: '15px', fontWeight: '700' }}>{selected.name}</div>
              <div style={{ color: t.sub, fontSize: '12px', marginTop: '4px' }}>{selected.position}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'سازمان', value: selected.organization, icon: '🏢' },
                { label: 'استان', value: selected.province, icon: '📍' },
                { label: 'تلفن', value: selected.phone, icon: '📞' },
                { label: 'ایمیل', value: selected.email, icon: '📧' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: t.inner, borderRadius: '8px' }}>
                  <span style={{ fontSize: '14px' }}>{item.icon}</span>
                  <div>
                    <div style={{ color: t.muted, fontSize: '10px' }}>{item.label}</div>
                    <div style={{ color: t.text, fontSize: '12px' }}>{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => toggleFavorite(selected.id, selected.favorite)}
              style={{ background: selected.favorite ? '#c9a84c22' : t.inner, border: `1px solid ${selected.favorite ? '#c9a84c44' : t.border}`, borderRadius: '8px', padding: '10px', color: selected.favorite ? '#e8c96a' : t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              {selected.favorite ? '⭐ حذف از موردعلاقه‌ها' : '☆ افزودن به موردعلاقه‌ها'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}