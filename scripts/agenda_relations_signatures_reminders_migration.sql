-- دستور جلسه، جلسات مرتبط، امضای صورت‌جلسه، یادآور تکالیف — RLS برای جداولی که از قبل در
-- Supabase ساخته شده‌اند: meeting_agenda_items, meeting_relations, minutes_signatures,
-- action_item_reminders. ستون یا تایپ جدولی تغییر نمی‌کند — فقط RLS/ایندکس/Realtime.
-- پیش‌نیاز: departments_migration.sql و meeting_minutes_migration.sql باید قبلاً اجرا شده باشند.

-- ===== Realtime =====
do $$ begin
  alter publication supabase_realtime add table meeting_agenda_items;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table meeting_relations;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table minutes_signatures;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table action_item_reminders;
exception when duplicate_object then null;
end $$;

-- ===== ایندکس‌ها =====
create index if not exists meeting_agenda_items_meeting_id_idx on meeting_agenda_items(meeting_id);
create index if not exists meeting_relations_meeting_id_idx on meeting_relations(meeting_id);
create index if not exists meeting_relations_related_meeting_id_idx on meeting_relations(related_meeting_id);
create index if not exists minutes_signatures_minutes_id_idx on minutes_signatures(minutes_id);
create index if not exists action_item_reminders_action_item_id_idx on action_item_reminders(action_item_id);
create index if not exists action_item_reminders_remind_at_idx on action_item_reminders(remind_at) where sent = false;

-- ایندکس‌های زیر در بازبینی کد (اولویت پایین) پیشنهاد شدند و به‌صورت دستی در Supabase اعمال شدند؛
-- این خط‌ها صرفاً برای هم‌گام بودن این migration با وضعیت واقعی دیتابیس اضافه شده‌اند (idempotent، بدون اثر روی داده).
create index if not exists minutes_signatures_user_id_idx on minutes_signatures(user_id);
create index if not exists meeting_action_items_assigned_to_user_id_idx on meeting_action_items(assigned_to_user_id);

-- ===== ۱. meeting_agenda_items =====
alter table meeting_agenda_items enable row level security;

create or replace function touch_agenda_item_updated_at()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists meeting_agenda_items_touch_updated_at on meeting_agenda_items;
create trigger meeting_agenda_items_touch_updated_at
  before update on meeting_agenda_items
  for each row execute function touch_agenda_item_updated_at();

drop policy if exists "agenda visible to own department or admin" on meeting_agenda_items;
create policy "agenda visible to own department or admin" on meeting_agenda_items
  for select to authenticated
  using (
    current_user_is_super_admin()
    or exists (select 1 from meetings m where m.id = meeting_agenda_items.meeting_id and m.department_id = current_user_department())
  );

drop policy if exists "role can insert agenda" on meeting_agenda_items;
create policy "role can insert agenda" on meeting_agenda_items
  for insert to authenticated
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY'))
    and exists (select 1 from meetings m where m.id = meeting_agenda_items.meeting_id and (current_user_is_super_admin() or m.department_id = current_user_department()))
  );

drop policy if exists "role can update agenda" on meeting_agenda_items;
create policy "role can update agenda" on meeting_agenda_items
  for update to authenticated
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY'))
    and exists (select 1 from meetings m where m.id = meeting_agenda_items.meeting_id and (current_user_is_super_admin() or m.department_id = current_user_department()))
  );

drop policy if exists "role can delete agenda" on meeting_agenda_items;
create policy "role can delete agenda" on meeting_agenda_items
  for delete to authenticated
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY'))
    and exists (select 1 from meetings m where m.id = meeting_agenda_items.meeting_id and (current_user_is_super_admin() or m.department_id = current_user_department()))
  );

-- ===== ۲. meeting_relations =====
alter table meeting_relations enable row level security;

drop policy if exists "relations visible to own department or admin" on meeting_relations;
create policy "relations visible to own department or admin" on meeting_relations
  for select to authenticated
  using (
    current_user_is_super_admin()
    or exists (select 1 from meetings m where m.id = meeting_relations.meeting_id and m.department_id = current_user_department())
    or exists (select 1 from meetings m where m.id = meeting_relations.related_meeting_id and m.department_id = current_user_department())
  );

drop policy if exists "role can insert relations" on meeting_relations;
create policy "role can insert relations" on meeting_relations
  for insert to authenticated
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY'))
    and exists (select 1 from meetings m where m.id = meeting_relations.meeting_id and (current_user_is_super_admin() or m.department_id = current_user_department()))
    and exists (select 1 from meetings m where m.id = meeting_relations.related_meeting_id and (current_user_is_super_admin() or m.department_id = current_user_department()))
  );

drop policy if exists "role can delete relations" on meeting_relations;
create policy "role can delete relations" on meeting_relations
  for delete to authenticated
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY'))
    and exists (select 1 from meetings m where m.id = meeting_relations.meeting_id and (current_user_is_super_admin() or m.department_id = current_user_department()))
  );

-- ===== ۳. minutes_signatures =====
alter table minutes_signatures enable row level security;

drop policy if exists "signatures visible to own department or admin" on minutes_signatures;
create policy "signatures visible to own department or admin" on minutes_signatures
  for select to authenticated
  using (
    current_user_is_super_admin()
    or exists (
      select 1 from meeting_minutes mm join meetings m on m.id = mm.meeting_id
      where mm.id = minutes_signatures.minutes_id and m.department_id = current_user_department()
    )
  );

drop policy if exists "role can insert signatures" on minutes_signatures;
create policy "role can insert signatures" on minutes_signatures
  for insert to authenticated
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY'))
    and exists (
      select 1 from meeting_minutes mm join meetings m on m.id = mm.meeting_id
      where mm.id = minutes_signatures.minutes_id and (current_user_is_super_admin() or m.department_id = current_user_department())
    )
  );

-- خود امضاکننده هم می‌تونه ردیف امضای خودش رو آپدیت کنه (مسیر اصلی از طریق API روت با service role انجام می‌شه)
drop policy if exists "signatory or role can update signatures" on minutes_signatures;
create policy "signatory or role can update signatures" on minutes_signatures
  for update to authenticated
  using (
    user_id = auth.uid()
    or (
      exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY'))
      and exists (
        select 1 from meeting_minutes mm join meetings m on m.id = mm.meeting_id
        where mm.id = minutes_signatures.minutes_id and (current_user_is_super_admin() or m.department_id = current_user_department())
      )
    )
  );

drop policy if exists "role can delete signatures" on minutes_signatures;
create policy "role can delete signatures" on minutes_signatures
  for delete to authenticated
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY'))
    and exists (
      select 1 from meeting_minutes mm join meetings m on m.id = mm.meeting_id
      where mm.id = minutes_signatures.minutes_id and (current_user_is_super_admin() or m.department_id = current_user_department())
    )
  );

-- ===== ۴. action_item_reminders =====
alter table action_item_reminders enable row level security;

drop policy if exists "reminders visible to own department or admin" on action_item_reminders;
create policy "reminders visible to own department or admin" on action_item_reminders
  for select to authenticated
  using (
    current_user_is_super_admin()
    or exists (
      select 1 from meeting_action_items ai join meetings m on m.id = ai.meeting_id
      where ai.id = action_item_reminders.action_item_id and m.department_id = current_user_department()
    )
  );

drop policy if exists "role can insert reminders" on action_item_reminders;
create policy "role can insert reminders" on action_item_reminders
  for insert to authenticated
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY'))
    and exists (
      select 1 from meeting_action_items ai join meetings m on m.id = ai.meeting_id
      where ai.id = action_item_reminders.action_item_id and (current_user_is_super_admin() or m.department_id = current_user_department())
    )
  );

drop policy if exists "role can update reminders" on action_item_reminders;
create policy "role can update reminders" on action_item_reminders
  for update to authenticated
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY'))
    and (
      current_user_is_super_admin()
      or exists (
        select 1 from meeting_action_items ai join meetings m on m.id = ai.meeting_id
        where ai.id = action_item_reminders.action_item_id and m.department_id = current_user_department()
      )
    )
  );

drop policy if exists "role can delete reminders" on action_item_reminders;
create policy "role can delete reminders" on action_item_reminders
  for delete to authenticated
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY'))
    and exists (
      select 1 from meeting_action_items ai join meetings m on m.id = ai.meeting_id
      where ai.id = action_item_reminders.action_item_id and (current_user_is_super_admin() or m.department_id = current_user_department())
    )
  );
