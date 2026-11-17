begin;
create function public.ff_insert_submission(p_record jsonb,p_evidence jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare new_id uuid;
begin
  if p_record->>'status' <> 'pending' then raise exception 'Pending status required'; end if;
  insert into public.ff_submissions
    (id,request_id,kind,category_id,city,locality,material,size_cm,finish,segment,price_inr,price_type,observed_at,source_type,attributes,notes,status,image_consent)
  select id,request_id,kind,category_id,city,locality,material,size_cm,finish,segment,price_inr,price_type,observed_at,source_type,attributes,notes,'pending',image_consent
  from jsonb_populate_record(null::public.ff_submissions,p_record)
  returning id into new_id;
  insert into public.ff_evidence(submission_id,object_path,purpose,mime_type,byte_size)
  select new_id,object_path,purpose,mime_type,byte_size
  from jsonb_to_recordset(p_evidence) as e(object_path text,purpose text,mime_type text,byte_size integer);
  return new_id;
end;
$$;
revoke all on function public.ff_insert_submission(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.ff_insert_submission(jsonb,jsonb) to service_role;
commit;
