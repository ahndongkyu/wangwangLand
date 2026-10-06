-- 기존 app_settings 테이블을 사용합니다. 노출 순서와 대표사진을 함께 저장합니다.
create or replace function public.save_home_animals(selected_ids uuid[], auto_fill boolean, photo_choices jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare choice record; photo_index integer; animal public.dogs%rowtype;
begin
  if selected_ids is null or cardinality(selected_ids) > 4 or auto_fill is null
     or jsonb_typeof(photo_choices) is distinct from 'object'
     or cardinality(selected_ids) <> (select count(distinct id) from unnest(selected_ids) id) then
    raise exception 'Invalid home selection';
  end if;
  -- 동시에 들어오는 홈 편집을 직렬화하고 상태/사진 변경과 충돌하지 않게 잠급니다.
  perform pg_advisory_xact_lock(61006001);
  perform id from public.dogs order by id for update;
  if exists(select 1 from unnest(selected_ids) s(id) left join public.dogs d on d.id = s.id
            where d.id is null or d.status not in ('보호중','임시보호중') or coalesce(cardinality(d.images),0) = 0) then
    raise exception 'Animal is no longer eligible';
  end if;
  for choice in select * from jsonb_each_text(photo_choices) loop
    select * into animal from public.dogs where id = choice.key::uuid;
    if not found then raise exception 'Animal not found'; end if;
    photo_index := array_position(animal.images, choice.value);
    if photo_index is null then raise exception 'Photo has changed'; end if;
    update public.dogs set thumbnail_index = photo_index - 1 where id = animal.id;
  end loop;
  update public.dogs set is_pinned = false, pin_order = null where is_pinned = true;
  update public.dogs d set is_pinned = true, pin_order = s.ordinality
    from unnest(selected_ids) with ordinality s(id, ordinality) where d.id = s.id;
  insert into public.app_settings(key,value) values ('home_auto_fill', to_jsonb(auto_fill))
    on conflict(key) do update set value = excluded.value;
end;
$$;
revoke all on function public.save_home_animals(uuid[],boolean,jsonb) from public, anon, authenticated;
grant execute on function public.save_home_animals(uuid[],boolean,jsonb) to service_role;
