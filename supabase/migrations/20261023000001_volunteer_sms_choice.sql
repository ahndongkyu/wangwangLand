begin;
alter table public.sms_delivery_logs drop constraint if exists sms_delivery_logs_state_check;
alter table public.sms_delivery_logs add constraint sms_delivery_logs_state_check
  check (state in ('pending', 'accepted', 'failed', 'unknown', 'skipped'));
create index if not exists volunteer_applications_member_approved_submitted_idx
  on public.volunteer_applications (created_by, submitted_at desc) where status = '승인';
commit;
