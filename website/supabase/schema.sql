-- 在对应 Supabase 项目的 SQL Editor 中运行一次。
-- 这个脚本可以重复运行，不会删除已有的宾客数据。
begin;

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  side text not null check (side in ('groom', 'bride')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('clothing', 'decoration', 'copywriting', 'other')),
  name text not null default '' check (char_length(name) <= 160),
  remark text not null default '' check (char_length(remark) <= 240),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  time text not null default '' check (char_length(time) <= 20),
  content text not null default '' check (char_length(content) <= 200),
  remark text not null default '' check (char_length(remark) <= 240),
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.host_script (
  id uuid primary key default '00000000-0000-0000-0000-000000000001'::uuid check (id = '00000000-0000-0000-0000-000000000001'::uuid),
  content text not null default '' check (char_length(content) <= 100000),
  updated_at timestamptz not null default now()
);

create index if not exists guests_created_at_id_idx on public.guests (created_at, id);
create index if not exists materials_category_created_at_idx on public.materials (category, created_at, id);
create index if not exists schedules_sort_order_idx on public.schedules (sort_order, created_at, id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists guests_set_updated_at on public.guests;
create trigger guests_set_updated_at before update on public.guests for each row execute function public.set_updated_at();
drop trigger if exists materials_set_updated_at on public.materials;
create trigger materials_set_updated_at before update on public.materials for each row execute function public.set_updated_at();
drop trigger if exists schedules_set_updated_at on public.schedules;
create trigger schedules_set_updated_at before update on public.schedules for each row execute function public.set_updated_at();
drop trigger if exists host_script_set_updated_at on public.host_script;
create trigger host_script_set_updated_at before update on public.host_script for each row execute function public.set_updated_at();

alter table public.guests enable row level security;
alter table public.materials enable row level security;
alter table public.schedules enable row level security;
alter table public.host_script enable row level security;

grant usage on schema public to anon;

revoke all on public.guests from anon, authenticated;
grant select, insert, delete on public.guests to anon;
drop policy if exists guests_public_read on public.guests;
create policy guests_public_read on public.guests for select to anon using (true);
drop policy if exists guests_public_insert on public.guests;
create policy guests_public_insert on public.guests for insert to anon with check (true);
drop policy if exists guests_public_delete on public.guests;
create policy guests_public_delete on public.guests for delete to anon using (true);

revoke all on public.materials from anon, authenticated;
grant select, insert, update, delete on public.materials to anon;
drop policy if exists materials_public_read on public.materials;
create policy materials_public_read on public.materials for select to anon using (true);
drop policy if exists materials_public_insert on public.materials;
create policy materials_public_insert on public.materials for insert to anon with check (true);
drop policy if exists materials_public_update on public.materials;
create policy materials_public_update on public.materials for update to anon using (true) with check (true);
drop policy if exists materials_public_delete on public.materials;
create policy materials_public_delete on public.materials for delete to anon using (true);

revoke all on public.schedules from anon, authenticated;
grant select, insert, update, delete on public.schedules to anon;
drop policy if exists schedules_public_read on public.schedules;
create policy schedules_public_read on public.schedules for select to anon using (true);
drop policy if exists schedules_public_insert on public.schedules;
create policy schedules_public_insert on public.schedules for insert to anon with check (true);
drop policy if exists schedules_public_update on public.schedules;
create policy schedules_public_update on public.schedules for update to anon using (true) with check (true);
drop policy if exists schedules_public_delete on public.schedules;
create policy schedules_public_delete on public.schedules for delete to anon using (true);

revoke all on public.host_script from anon, authenticated;
grant select, insert, update, delete on public.host_script to anon;
drop policy if exists host_script_public_read on public.host_script;
create policy host_script_public_read on public.host_script for select to anon using (true);
drop policy if exists host_script_public_insert on public.host_script;
create policy host_script_public_insert on public.host_script for insert to anon with check (true);
drop policy if exists host_script_public_update on public.host_script;
create policy host_script_public_update on public.host_script for update to anon using (true) with check (true);
drop policy if exists host_script_public_delete on public.host_script;
create policy host_script_public_delete on public.host_script for delete to anon using (true);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['guests', 'materials', 'schedules', 'host_script'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;

commit;
