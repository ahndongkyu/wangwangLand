-- 자동 번역 결과와 월간 무료 한도 사용량을 보관한다.
-- 원문이 변경되면 source_hash가 달라져 새 번역을 생성한다.

create table if not exists translation_cache (
  id uuid primary key default gen_random_uuid(),
  source_hash text not null,
  source_locale text not null default 'ko' check (source_locale = 'ko'),
  target_locale text not null check (target_locale in ('en', 'zh')),
  source_text text not null,
  translated_text text not null,
  character_count integer not null check (character_count > 0),
  created_at timestamptz not null default now(),
  unique (source_hash, target_locale)
);

alter table translation_cache enable row level security;

create table if not exists translation_monthly_usage (
  month date primary key,
  character_count integer not null default 0 check (character_count >= 0),
  updated_at timestamptz not null default now()
);

alter table translation_monthly_usage enable row level security;

-- 서비스 역할에서만 호출한다. 무료 한도를 초과하면 false를 반환해 API 호출 전 차단한다.
create or replace function reserve_translation_characters(requested_count integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_month date := date_trunc('month', timezone('Asia/Seoul', now()))::date;
  current_count integer;
begin
  if requested_count <= 0 or requested_count > 20000 then
    return false;
  end if;

  insert into translation_monthly_usage (month, character_count)
  values (current_month, 0)
  on conflict (month) do nothing;

  select character_count
    into current_count
    from translation_monthly_usage
   where month = current_month
   for update;

  if current_count + requested_count > 450000 then
    return false;
  end if;

  update translation_monthly_usage
     set character_count = current_count + requested_count,
         updated_at = now()
   where month = current_month;

  return true;
end;
$$;

revoke all on function reserve_translation_characters(integer) from public;
grant execute on function reserve_translation_characters(integer) to service_role;
