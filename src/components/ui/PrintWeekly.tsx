'use client'

interface PrintWeeklyProps {
  weekStart: Date
  weekDates: Date[]
  meetingsByDay: Record<string, any[]>
  days: string[]
}

function toJalali(dateStr: string): string {
  try {
    const jalaali = require('jalaali-js')
    const d = new Date(dateStr)
    const j = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
    return `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`
  } catch { return dateStr }
}

function dateToString(d: Date): string {
  return d.toISOString().split('T')[0]
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'عادی', med: 'متوسط', high: 'مهم', critical: 'فوری',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار', approved: 'تأیید شده', cancelled: 'لغو شده',
}

export function PrintWeekly({ weekStart, weekDates, meetingsByDay, days }: PrintWeeklyProps) {
  const handlePrint = () => {
    // محتوای چاپ
    const printContent = document.getElementById('print-weekly-content')
    if (!printContent) return

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <title>برنامه هفتگی جلسات</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            direction: rtl;
            color: #1a1a2e;
            background: #fff;
            padding: 24px;
            font-size: 12px;
          }

          /* هدر */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid #1a1a2e;
          }

          .header-right h1 {
            font-size: 20px;
            font-weight: 800;
            color: #1a1a2e;
            margin-bottom: 4px;
          }

          .header-right p {
            font-size: 11px;
            color: #666;
          }

          .header-left {
            text-align: left;
            font-size: 11px;
            color: #666;
          }

          .header-left .logo-text {
            font-size: 13px;
            font-weight: 700;
            color: #1a1a2e;
            margin-bottom: 4px;
          }

          /* جدول */
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }

          thead th {
            background: #1a1a2e;
            color: #fff;
            padding: 10px 12px;
            text-align: right;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.3px;
          }

          thead th:first-child {
            width: 120px;
            border-radius: 0 6px 6px 0;
          }

          thead th:last-child {
            border-radius: 6px 0 0 6px;
          }

          tbody tr {
            border-bottom: 1px solid #e8e8e8;
          }

          tbody tr:nth-child(even) {
            background: #f8f9fa;
          }

          tbody tr:last-child {
            border-bottom: none;
          }

          tbody tr.weekend {
            background: #f0f0f0;
            color: #999;
          }

          tbody tr.today {
            background: #fdf8e8;
            border-right: 3px solid #c9a84c;
          }

          td {
            padding: 10px 12px;
            vertical-align: top;
          }

          .day-cell {
            font-weight: 700;
            font-size: 12px;
            white-space: nowrap;
          }

          .day-date {
            font-size: 10px;
            color: #888;
            margin-top: 2px;
            font-weight: 400;
          }

          .today-badge {
            display: inline-block;
            font-size: 9px;
            background: #c9a84c;
            color: #fff;
            padding: 1px 5px;
            border-radius: 4px;
            margin-top: 3px;
            font-weight: 700;
          }

          .no-meeting {
            color: #bbb;
            font-size: 11px;
            font-style: italic;
          }

          /* آیتم جلسه */
          .meeting-item {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            padding: 6px 0;
            border-bottom: 1px dashed #eee;
          }

          .meeting-item:last-child {
            border-bottom: none;
          }

          .meeting-time {
            font-size: 11px;
            font-weight: 700;
            color: #1a1a2e;
            white-space: nowrap;
            min-width: 80px;
          }

          .meeting-info {
            flex: 1;
          }

          .meeting-title {
            font-size: 12px;
            font-weight: 600;
            color: #1a1a2e;
            margin-bottom: 2px;
          }

          .meeting-meta {
            font-size: 10px;
            color: #777;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }

          .meeting-priority {
            display: inline-block;
            font-size: 9px;
            padding: 1px 6px;
            border-radius: 4px;
            border: 1px solid #999;
            color: #555;
            font-weight: 600;
            white-space: nowrap;
          }

          .meeting-status {
            display: inline-block;
            font-size: 9px;
            padding: 1px 6px;
            border-radius: 4px;
            border: 1px solid #bbb;
            color: #777;
            font-weight: 600;
            white-space: nowrap;
          }

          /* فوتر */
          .footer {
            margin-top: 24px;
            padding-top: 12px;
            border-top: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
            color: #aaa;
          }

          .footer-stats {
            display: flex;
            gap: 16px;
          }

          .stat-item {
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .stat-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            border: 1px solid #999;
          }

          /* چاپ */
          @media print {
            body { padding: 16px; }
            @page {
              size: A4;
              margin: 15mm 15mm 15mm 15mm;
            }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); }
          }
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  // آمار هفته
  const allMeetings = days.flatMap(day => meetingsByDay[day] || [])
  const totalMeetings = allMeetings.length
  const approvedMeetings = allMeetings.filter(m => m.status === 'approved').length
  const pendingMeetings = allMeetings.filter(m => m.status === 'pending').length
  const today = dateToString(new Date())

  return (
    <>
      {/* دکمه چاپ */}
      <button
        onClick={handlePrint}
        title="چاپ برنامه هفتگی"
        style={{
          background: '#1a1a2e22',
          border: '1px solid #1a1a2e44',
          borderRadius: '8px',
          padding: '9px 12px',
          color: '#1a1a2e',
          fontSize: '14px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          flexShrink: 0,
        }}
      >🖨️</button>

      {/* محتوای مخفی برای چاپ */}
      <div id="print-weekly-content" style={{ display: 'none' }}>
        {/* هدر */}
        <div className="header">
          <div className="header-right">
            <h1>برنامه هفتگی جلسات</h1>
            <p>
              {toJalali(dateToString(weekStart))} تا {toJalali(dateToString(weekDates[6]))}
            </p>
          </div>
          <div className="header-left">
            <div className="logo-text">وزارت آموزش و پرورش</div>
            <div>معاونت آموزش متوسطه</div>
            <div style={{ marginTop: '4px' }}>
              تاریخ چاپ: {toJalali(today)}
            </div>
          </div>
        </div>

        {/* جدول */}
        <table>
          <thead>
            <tr>
              <th>روز</th>
              <th>ساعت</th>
              <th>عنوان جلسه</th>
              <th>مکان</th>
              <th>نوع</th>
              <th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day, i) => {
              const dayMeetings = (meetingsByDay[day] || []).sort((a: any, b: any) => (a.time || '').localeCompare(b.time || ''))
              const isToday = dateToString(weekDates[i]) === today
              const isWeekend = day === 'جمعه'

              return (
                <tr key={day} className={isToday ? 'today' : isWeekend ? 'weekend' : ''}>
                  <td>
                    <div className="day-cell">{day}</div>
                    <div className="day-date">{toJalali(dateToString(weekDates[i]))}</div>
                    {isToday && <div className="today-badge">امروز</div>}
                  </td>
                  {dayMeetings.length === 0 ? (
                    <td colSpan={5}>
                      <span className="no-meeting">جلسه‌ای ثبت نشده</span>
                    </td>
                  ) : (
                    <td colSpan={5} style={{ padding: '4px 12px' }}>
                      {dayMeetings.map((meeting: any, mi: number) => (
                        <div key={mi} className="meeting-item">
                          <div className="meeting-time">
                            {meeting.time}
                            {meeting.end_time && ` — ${meeting.end_time}`}
                          </div>
                          <div className="meeting-info">
                            <div className="meeting-title">{meeting.title_fa}</div>
                            <div className="meeting-meta">
                              {meeting.location && <span>📍 {meeting.location}</span>}
                              {meeting.participants && <span>👥 {meeting.participants} نفر</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-end' }}>
                            <span className="meeting-priority">{PRIORITY_LABELS[meeting.priority] || meeting.priority}</span>
                            <span className="meeting-status">{STATUS_LABELS[meeting.status] || meeting.status}</span>
                          </div>
                        </div>
                      ))}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* فوتر */}
        <div className="footer">
          <div className="footer-stats">
            <span>مجموع: <strong>{totalMeetings}</strong> جلسه</span>
            <span>تأیید شده: <strong>{approvedMeetings}</strong></span>
            <span>در انتظار: <strong>{pendingMeetings}</strong></span>
          </div>
          <div>سامانه مدیریت معاونت آموزش متوسطه</div>
        </div>
      </div>
    </>
  )
}