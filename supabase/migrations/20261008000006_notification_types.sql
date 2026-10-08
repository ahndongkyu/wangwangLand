begin;
set local lock_timeout = '5s';

-- 기존 댓글·답글 알림을 유지하면서 현재 소스에서 사용하는 알림 유형을 허용한다.
-- 기존 알림의 변경·재발송이나 전날 알림 기능 활성화는 수행하지 않는다.
alter table public.notifications
  drop constraint if exists notifications_type_check,
  add constraint notifications_type_check check (type in (
    'comment_on_post',
    'reply_to_comment',
    'application_status_changed',
    'application_approved',
    'application_rejected',
    'application_under_review',
    'volunteer_reschedule_approved',
    'volunteer_reschedule_rejected',
    'application_cancelled',
    'event_signup_confirmed',
    'event_changed',
    'event_canceled',
    'event_reminder'
  ));

commit;
