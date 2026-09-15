-- 在对应 Supabase 项目的 SQL Editor 中运行一次。
-- 公开协作：未登录访客可读取、新增和删除宾客；不开放更新或其他表。
begin;
create table public.guests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  side text not null check (side in ('groom', 'bride')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index guests_created_at_id_idx on public.guests (created_at, id);
alter table public.guests enable row level security;
grant usage on schema public to anon;
revoke all on public.guests from anon, authenticated;
grant select, insert, delete on public.guests to anon;
create policy guests_public_read on public.guests for select to anon using (true);
create policy guests_public_insert on public.guests for insert to anon with check (true);
create policy guests_public_delete on public.guests for delete to anon using (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='guests') then
    alter publication supabase_realtime add table public.guests;
  end if;
end $$;
commit;
