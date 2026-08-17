// دیکشنری‌های برچسب/رنگ مشترک که در چند صفحه به‌صورت جداگانه تکرار شده بودن —
// اینجا یک‌بار تعریف می‌شن تا مقادیر بین صفحات مختلف از هم جدا (drift) نشن.

// اولویت — جلسات، تکالیف صورت‌جلسه، پیگیری تکالیف، درخواست‌ها، نامه‌ها
export const PRIORITY_LABELS: Record<string, string> = {
  low: 'عادی', med: 'متوسط', high: 'مهم', critical: 'فوری',
}
export const PRIORITY_COLORS: Record<string, string> = {
  low: '#4a9eff', med: '#c9a84c', high: '#e09444', critical: '#e05555',
}

// وضعیت تکلیف — تکالیف صورت‌جلسه، پیگیری تکالیف، درخواست‌ها
export const TASK_STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار', in_progress: 'در حال انجام', done: 'انجام شد', cancelled: 'لغو شد',
}
export const TASK_STATUS_COLORS: Record<string, string> = {
  pending: '#c9a84c', in_progress: '#4a9eff', done: '#3dbb82', cancelled: '#e05555',
}

// وضعیت جلسه
export const MEETING_STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار', approved: 'تأیید شده', cancelled: 'لغو شده',
}
export const MEETING_STATUS_COLORS: Record<string, string> = {
  pending: '#c9a84c', approved: '#3dbb82', cancelled: '#e05555',
}

// وضعیت گزارش
export const REPORT_STATUS_LABELS: Record<string, string> = {
  submitted: 'ارسال شده', reviewing: 'در حال بررسی', approved: 'تأیید شده', rejected: 'رد شده',
}
export const REPORT_STATUS_COLORS: Record<string, string> = {
  submitted: '#4a9eff', reviewing: '#c9a84c', approved: '#3dbb82', rejected: '#e05555',
}
