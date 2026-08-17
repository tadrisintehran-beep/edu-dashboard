'use client'

interface PrintMinutesProps {
  meeting: any
  minutes: any
  actionItems: any[]
  attendees: any[]
  signatures?: any[]
}

function toJalali(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const jalaali = require('jalaali-js')
    const d = new Date(dateStr)
    const j = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
    return `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`
  } catch { return dateStr }
}

const roleLabel: Record<string, string> = {
  decision_maker: 'تصمیم‌گیر', participant: 'شرکت‌کننده', observer: 'ناظر',
}
const externalTypeLabel: Record<string, string> = {
  organization: 'سازمان/نهاد خارجی', expert: 'کارشناس مدعو',
}
const priorityLabel: Record<string, string> = {
  low: 'عادی', med: 'متوسط', high: 'مهم', critical: 'فوری',
}
const statusLabel: Record<string, string> = {
  pending: 'در انتظار', in_progress: 'در حال انجام', done: 'انجام شد', cancelled: 'لغو شد',
}

export function PrintMinutes({ meeting, minutes, actionItems, attendees, signatures = [] }: PrintMinutesProps) {
  const contentId = `print-minutes-content-${meeting.id}`

  const handlePrint = () => {
    const content = document.getElementById(contentId)
    if (!content) return
    const pw = window.open('', '_blank', 'width=900,height=700')
    if (!pw) return
    pw.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
<meta charset="UTF-8">
<title>صورت‌جلسه — ${meeting.title_fa}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; color: #1a1a2e; background: #fff; font-size: 11px; line-height: 1.7; padding: 24px; }

.header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 3px solid #1a1a2e; margin-bottom: 20px; }
.logo { display: flex; align-items: center; gap: 12px; }
.logo-icon { width: 48px; height: 48px; background: #1a1a2e; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.logo-text h1 { font-size: 16px; font-weight: 800; }
.logo-text p { font-size: 11px; color: #666; margin-top: 2px; }
.meta { text-align: left; }
.meta .title { font-size: 13px; font-weight: 700; }
.meta .date { font-size: 10px; color: #888; margin-top: 4px; }
.badge-top { display: inline-block; background: #1a1a2e; color: #fff; font-size: 9px; padding: 2px 8px; border-radius: 10px; margin-top: 4px; }

.info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
.info-box { border: 1px solid #e0e0e0; border-radius: 8px; padding: 10px 12px; }
.info-box .lbl { font-size: 9px; color: #888; margin-bottom: 3px; }
.info-box .val { font-size: 12px; font-weight: 700; }

.section { margin-bottom: 20px; }
.section-title { font-size: 13px; font-weight: 800; border-right: 4px solid #c9a84c; padding-right: 10px; margin-bottom: 10px; }
.section-body { font-size: 11px; line-height: 1.9; white-space: pre-wrap; color: #333; }
.empty { color: #aaa; font-size: 11px; border: 1px solid #eee; border-radius: 8px; padding: 12px; text-align: center; }

table { width: 100%; border-collapse: collapse; font-size: 10px; }
thead tr { background: #1a1a2e; color: #fff; }
thead th { padding: 7px 9px; text-align: right; font-weight: 600; }
tbody tr { border-bottom: 1px solid #f0f0f0; }
tbody tr:nth-child(even) { background: #f9f9f9; }
tbody td { padding: 6px 9px; vertical-align: top; }
.badge { display: inline-block; padding: 1px 7px; border-radius: 6px; font-size: 9px; font-weight: 600; border: 1px solid #ddd; }

.signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 32px; }
.signature-box { border-top: 1px solid #ccc; padding-top: 8px; text-align: center; }
.signature-box p { font-size: 10px; color: #888; }

.footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #e0e0e0; display: flex; justify-content: space-between; font-size: 9px; color: #aaa; }

@media print {
  @page { size: A4; margin: 12mm; }
}
</style>
</head>
<body>
${content.innerHTML}
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}</script>
</body>
</html>`)
    pw.document.close()
  }

  return (
    <>
      <button onClick={handlePrint} title="چاپ صورت‌جلسه" aria-label="چاپ صورت‌جلسه"
        style={{ background: '#1a1a2e22', border: '1px solid #1a1a2e44', borderRadius: '8px', padding: '9px 12px', color: 'inherit', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
        🖨️ چاپ
      </button>

      <div id={contentId} style={{ display: 'none' }}>
        <div className="header">
          <div className="logo">
            <div className="logo-icon">🏛️</div>
            <div className="logo-text">
              <h1>وزارت آموزش و پرورش</h1>
              <p>معاونت آموزش متوسطه — صورت‌جلسه</p>
            </div>
          </div>
          <div className="meta">
            <div className="title">{meeting.title_fa}</div>
            <div className="date">تاریخ چاپ: {toJalali(new Date().toISOString())}</div>
            <div className="badge-top">{minutes?.finalized ? 'نهایی‌شده' : 'پیش‌نویس'}</div>
          </div>
        </div>

        <div className="info-grid">
          <div className="info-box"><div className="lbl">تاریخ جلسه</div><div className="val">{meeting.day_of_week} {toJalali(meeting.date)}</div></div>
          <div className="info-box"><div className="lbl">ساعت</div><div className="val">{meeting.time}{meeting.end_time ? `—${meeting.end_time}` : ''}</div></div>
          <div className="info-box"><div className="lbl">مکان</div><div className="val">{meeting.location || '—'}</div></div>
          <div className="info-box"><div className="lbl">نوع جلسه</div><div className="val">{meeting.meeting_type || '—'}</div></div>
        </div>

        <div className="section">
          <div className="section-title">شرکت‌کنندگان ({attendees.length} نفر)</div>
          {attendees.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>نام</th>
                  <th>سمت/سازمان</th>
                  <th>نقش در جلسه</th>
                  <th>نوع</th>
                  <th>حضور</th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((a, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{a.is_external ? a.external_name : a.user_name}</td>
                    <td>{a.is_external ? (a.external_org || '—') : (a.department_name || '—')}</td>
                    <td>{roleLabel[a.role_in_meeting] || a.role_in_meeting}</td>
                    <td>{a.is_external ? (externalTypeLabel[a.external_type] || 'خارجی') : 'داخلی'}</td>
                    <td>{a.attended ? '✓ حاضر' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty">شرکت‌کننده‌ای ثبت نشده</div>}
        </div>

        <div className="section">
          <div className="section-title">خلاصه مذاکرات</div>
          {minutes?.summary ? <div className="section-body">{minutes.summary}</div> : <div className="empty">ثبت نشده</div>}
        </div>

        <div className="section">
          <div className="section-title">تصمیمات</div>
          {minutes?.decisions ? <div className="section-body">{minutes.decisions}</div> : <div className="empty">ثبت نشده</div>}
        </div>

        <div className="section">
          <div className="section-title">تکالیف ({actionItems.length} مورد)</div>
          {actionItems.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>عنوان</th>
                  <th>مسئول</th>
                  <th>مهلت</th>
                  <th>اولویت</th>
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {actionItems.map((ai, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{ai.title}</td>
                    <td>{ai.assigned_to_name || '—'}</td>
                    <td>{ai.due_date ? toJalali(ai.due_date) : '—'}</td>
                    <td>{priorityLabel[ai.priority] || ai.priority}</td>
                    <td>{statusLabel[ai.status] || ai.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty">تکلیفی ثبت نشده</div>}
        </div>

        {(minutes?.next_meeting_date || minutes?.next_meeting_notes) && (
          <div className="section">
            <div className="section-title">جلسه بعدی</div>
            <div className="section-body">
              {minutes?.next_meeting_date && <div>تاریخ: {toJalali(minutes.next_meeting_date)}</div>}
              {minutes?.next_meeting_notes && <div style={{ marginTop: '4px' }}>{minutes.next_meeting_notes}</div>}
            </div>
          </div>
        )}

        {signatures.length > 0 ? (
          <div className="section">
            <div className="section-title">امضاها</div>
            <table>
              <thead>
                <tr>
                  <th>نام</th>
                  <th>سمت</th>
                  <th>وضعیت</th>
                  <th>تاریخ امضا</th>
                </tr>
              </thead>
              <tbody>
                {signatures.map((s, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{s.user_name}</td>
                    <td>{s.user_role || '—'}</td>
                    <td>{s.is_signed ? '✓ امضا شده' : 'در انتظار امضا'}</td>
                    <td>{s.signed_at ? toJalali(s.signed_at) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="signature-grid">
            {[
              { title: 'تنظیم‌کننده صورت‌جلسه', name: 'مسئول دفتر معاونت' },
              { title: 'تأییدکننده', name: 'معاون وزیر آموزش و پرورش' },
            ].map((s, i) => (
              <div key={i} className="signature-box">
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '32px' }}>{s.title}</div>
                <div style={{ fontSize: '11px', fontWeight: 600 }}>{s.name}</div>
                <p style={{ marginTop: '4px' }}>امضا و مهر</p>
              </div>
            ))}
          </div>
        )}

        <div className="footer">
          <span>سامانه مدیریت معاونت آموزش متوسطه</span>
          <span>تاریخ چاپ: {toJalali(new Date().toISOString())}</span>
        </div>
      </div>
    </>
  )
}
