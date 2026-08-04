-- ادامه‌ی rls_fix.sql — قفل کردن سه جدولی که قبلاً باز مونده بودن چون در permissions.ts تعریف نشده بودن.
-- حالا 'tasks' به Resource در permissions.ts اضافه شده (همون قانون meetings: مشاهده برای همه،
-- ایجاد/ویرایش/حذف برای SUPER_ADMIN, DEPUTY_MINISTER, SECRETARY).
-- document_comments و document_versions زیرمجموعه‌ی documents هستن: مشاهده/نظر برای همه باز می‌مونه،
-- عملیات حساس‌تر (آپلود نسخه‌ی جدید سند، حذف نظر) محدود به SUPER_ADMIN/DEPUTY_MINISTER می‌شه.

-- ===== TASKS =====
drop policy if exists "authenticated can all tasks" on tasks;

create policy "authenticated can read tasks" on tasks
  for select to authenticated
  using (true);

create policy "role can insert tasks" on tasks
  for insert to authenticated
  with check (exists (
    select 1 from profiles where profiles.id = auth.uid()
      and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
  ));

create policy "role can update tasks" on tasks
  for update to authenticated
  using (exists (
    select 1 from profiles where profiles.id = auth.uid()
      and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
  ));

create policy "role can delete tasks" on tasks
  for delete to authenticated
  using (exists (
    select 1 from profiles where profiles.id = auth.uid()
      and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
  ));

-- ===== DOCUMENT_VERSIONS: مشاهده برای همه، آپلود نسخه‌ی جدید فقط SUPER_ADMIN/DEPUTY_MINISTER =====
drop policy if exists "authenticated can all document_versions" on document_versions;
drop policy if exists "allow insert for authenticated users" on document_versions;

create policy "role can insert document_versions" on document_versions
  for insert to authenticated
  with check (exists (
    select 1 from profiles where profiles.id = auth.uid()
      and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER')
  ));

-- ===== DOCUMENT_COMMENTS: مشاهده/ثبت نظر برای همه (مثل الان)، حذف نظر فقط SUPER_ADMIN/DEPUTY_MINISTER =====
drop policy if exists "authenticated can all document_comments" on document_comments;
drop policy if exists "allow delete for authenticated users" on document_comments;

create policy "role can delete document_comments" on document_comments
  for delete to authenticated
  using (exists (
    select 1 from profiles where profiles.id = auth.uid()
      and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER')
  ));
