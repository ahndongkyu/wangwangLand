begin;
create table if not exists public.privacy_access_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  resource text not null check(resource in ('member','volunteer','adoption','adoption_document')),
  target_id uuid not null,
  action text not null check(action in ('read','download')),
  occurred_at timestamptz not null default now()
);
create index if not exists privacy_access_logs_time on public.privacy_access_logs(occurred_at desc);
alter table public.privacy_access_logs enable row level security;
revoke all on public.privacy_access_logs from public,anon,authenticated;
grant all on public.privacy_access_logs to service_role;
grant select on public.privacy_access_logs to authenticated;
drop policy if exists privacy_audit_admin_read on public.privacy_access_logs;
create policy privacy_audit_admin_read on public.privacy_access_logs for select to authenticated using(public.is_top_admin());
notify pgrst,'reload schema';
commit;
