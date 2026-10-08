begin;
create table public.sms_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  recipient_name text,
  recipient_phone text not null,
  message text not null,
  application_id uuid,
  application_type text check (application_type in ('volunteer', 'adoption')),
  state text not null check (state in ('pending', 'accepted', 'failed', 'unknown')),
  provider_message_id text,
  error_message text
);
create index sms_delivery_logs_created_at_idx on public.sms_delivery_logs(created_at desc, id desc);
alter table public.sms_delivery_logs enable row level security;
revoke all on public.sms_delivery_logs from anon, authenticated;
grant all on public.sms_delivery_logs to service_role;
commit;
