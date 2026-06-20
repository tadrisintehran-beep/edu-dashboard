import * as XLSX from 'xlsx'

export function exportToExcel(data: any[], filename: string, sheetName = 'Sheet1') {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function exportReportsToExcel(reports: any[]) {
  const data = reports.map(r => ({
    'عنوان': r.title_fa,
    'نویسنده': r.author,
    'استان': r.province || '—',
    'واحد': r.department || '—',
    'وضعیت': r.status === 'submitted' ? 'ارسال شده' :
              r.status === 'reviewing' ? 'در بررسی' :
              r.status === 'approved' ? 'تأیید شده' : 'رد شده',
    'خلاصه': r.summary || '—',
    'تاریخ': new Date(r.created_at).toLocaleDateString('fa-IR'),
  }))
  exportToExcel(data, 'گزارش‌ها', 'گزارش‌ها')
}

export function exportMeetingsToExcel(meetings: any[]) {
  const data = meetings.map(m => ({
    'عنوان': m.title_fa,
    'تاریخ': m.date,
    'ساعت': m.time,
    'مکان': m.location || '—',
    'شرکت‌کنندگان': m.participants,
    'اولویت': m.priority === 'low' ? 'عادی' :
               m.priority === 'med' ? 'متوسط' :
               m.priority === 'high' ? 'مهم' : 'فوری',
    'وضعیت': m.status === 'pending' ? 'در انتظار' :
              m.status === 'approved' ? 'تأیید شده' : 'لغو شده',
  }))
  exportToExcel(data, 'جلسات', 'جلسات')
}

export function exportContactsToExcel(contacts: any[]) {
  const data = contacts.map(c => ({
    'نام': c.name,
    'سمت': c.position || '—',
    'سازمان': c.organization || '—',
    'استان': c.province || '—',
    'تلفن': c.phone || '—',
    'ایمیل': c.email || '—',
    'نقش': c.tag || '—',
  }))
  exportToExcel(data, 'مخاطبین', 'مخاطبین')
}