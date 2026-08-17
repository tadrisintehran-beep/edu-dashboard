// برای رشته‌هایی که مستقیم (نه از طریق innerHTML که React قبلاً escape کرده) داخل
// یک قالب HTML خام (مثل پنجره‌ی چاپ) درج می‌شن — جلوگیری از شکستن تگ و تزریق اسکریپت
export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
