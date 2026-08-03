-- این اسکریپت RLS رو با ماتریس دسترسی permissions.ts (SUPER_ADMIN / DEPUTY_MINISTER / SECRETARY / VIEWER) هماهنگ می‌کنه.
-- policyهای قدیمی که به همه‌ی کاربران لاگین‌شده (بدون توجه به نقش) اجازه‌ی نوشتن می‌دادن حذف می‌شن
-- و به‌جاشون policyهایی که واقعاً نقش کاربر رو چک می‌کنن جایگزین می‌شن.

-- ===== MEETINGS: مشاهده برای همه، ایجاد/ویرایش/حذف برای SUPER_ADMIN, DEPUTY_MINISTER, SECRETARY =====
drop policy if exists "authenticated can all meetings" on meetings;
drop policy if exists "authenticated users can delete meetings" on meetings;
drop policy if exists "authenticated users can insert meetings" on meetings;
drop policy if exists "authenticated users can update meetings" on meetings;

create policy "role can insert meetings" on meetings
  for insert to authenticated
  with check (exists (
    select 1 from profiles where profiles.id = auth.uid()
      and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
  ));

create policy "role can update meetings" on meetings
  for update to authenticated
  using (exists (
    select 1 from profiles where profiles.id = auth.uid()
      and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
  ));

create policy "role can delete meetings" on meetings
  for delete to authenticated
  using (exists (
    select 1 from profiles where profiles.id = auth.uid()
      and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
  ));

-- ===== REPORTS: مشاهده برای همه، ایجاد/ویرایش/حذف فقط SUPER_ADMIN, DEPUTY_MINISTER =====
drop policy if exists "authenticated can all reports" on reports;
drop policy if exists "authenticated users can delete reports" on reports;
drop policy if exists "authenticated users can insert reports" on reports;
drop policy if exists "authenticated users can update reports" on reports;

create policy "role can insert reports" on reports
  for insert to authenticated
  with check (exists (
    select 1 from profiles where profiles.id = auth.uid()
      and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER')
  ));

create policy "role can update reports" on reports
  for update to authenticated
  using (exists (
    select 1 from profiles where profiles.id = auth.uid()
      and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER')
  ));

create policy "role can delete reports" on reports
  for delete to authenticated
  using (exists (
    select 1 from profiles where profiles.id = auth.uid()
      and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER')
  ));

-- ===== DOCUMENTS: مشاهده برای همه، ایجاد/ویرایش/حذف فقط SUPER_ADMIN, DEPUTY_MINISTER =====
drop policy if exists "authenticated can all documents" on documents;
drop policy if exists "allow insert for authenticated users" on documents;
drop policy if exists "allow update for authenticated users" on documents;
drop policy if exists "allow delete own or admin" on documents;

create policy "role can insert documents" on documents
  for insert to authenticated
  with check (exists (
    select 1 from profiles where profiles.id = auth.uid()
      and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER')
  ));

create policy "role can update documents" on documents
  for update to authenticated
  using (exists (
    select 1 from profiles where profiles.id = auth.uid()
      and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER')
  ));

create policy "role can delete documents" on documents
  for delete to authenticated
  using (exists (
    select 1 from profiles where profiles.id = auth.uid()
      and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER')
  ));

-- ===== CONTACTS: مشاهده برای همه، ایجاد/ویرایش تا SECRETARY، حذف فقط SUPER_ADMIN, DEPUTY_MINISTER =====
drop policy if exists "authenticated can all contacts" on contacts;
drop policy if exists "authenticated users can delete contacts" on contacts;
drop policy if exists "authenticated users can insert contacts" on contacts;
drop policy if exists "authenticated users can update contacts" on contacts;

create policy "role can insert contacts" on contacts
  for insert to authenticated
  with check (exists (
    select 1 from profiles where profiles.id = auth.uid()
      and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
  ));

create policy "role can update contacts" on contacts
  for update to authenticated
  using (exists (
    select 1 from profiles where profiles.id = auth.uid()
      and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
  ));

create policy "role can delete contacts" on contacts
  for delete to authenticated
  using (exists (
    select 1 from profiles where profiles.id = auth.uid()
      and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER')
  ));

-- ===== ALERTS: SUPER_ADMIN/DEPUTY_MINISTER کامل، SECRETARY فقط مشاهده، VIEWER اصلاً دسترسی نداره =====
drop policy if exists "authenticated can all alerts" on alerts;
drop policy if exists "authenticated users can delete alerts" on alerts;
drop policy if exists "authenticated users can insert alerts" on alerts;
drop policy if exists "authenticated users can read alerts" on alerts;
drop policy if exists "authenticated users can update alerts" on alerts;

create policy "role can select alerts" on alerts
  for select to authenticated
  using (exists (
    select 1 from profiles where profiles.id = auth.uid()
      and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
  ));

create policy "role can insert alerts" on alerts
  for insert to authenticated
  with check (exists (
    select 1 from profiles where profiles.id = auth.uid()
      and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER')
  ));

create policy "role can update alerts" on alerts
  for update to authenticated
  using (exists (
    select 1 from profiles where profiles.id = auth.uid()
      and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER')
  ));

create policy "role can delete alerts" on alerts
  for delete to authenticated
  using (exists (
    select 1 from profiles where profiles.id = auth.uid()
      and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER')
  ));
