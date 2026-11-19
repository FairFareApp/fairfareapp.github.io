# Trusted manual moderation

Use the FairFare Supabase Dashboard, SQL Editor and private Storage browser as a trusted project operator. Public visitors have no approval capability. Never put a service-role key into the application or a browser console.

## Review

```sql
select id, kind, category_id, material, size_cm, finish, segment,
       locality, price_inr, price_type, observed_at, source_type,
       attributes, notes, image_consent, created_at
from public.ff_submissions
where status = 'pending'
order by created_at;
```

For one selected submission, inspect `ff_evidence` by `submission_id`, then view its UUID object paths in the private `fairfare-evidence` Storage bucket. Do not create public URLs. If a temporary signed URL is needed, create it only as a trusted operator and keep expiry short.

Check the product/category, actual material evidence, approximate measured size, finish, market segment, price type, date, location and duplicate evidence. A claimed species is not authenticated by a photograph. Reject out-of-scope, implausible, duplicate or personally identifying evidence. Do not approve QA fixtures or relabel synthetic records as genuine observations.

The redesign adds `independence_key` to published references. Use a stable key for the underlying observation/source; repeated submissions of the same receipt or seller quote must not become separate evidence. A unique submission UUID alone does not prove independence. The matcher also deduplicates record IDs. Carving detail is optional and stays unknown unless inspected. New public image metadata must describe an authorized public photograph or a clearly labelled appropriate finish illustration; never copy private evidence into the public bucket without separate permission. Every current main demonstration listing has a finish illustration; future records without authorized imagery show an honest fallback.

## Approve atomically

Replace both UUID and market ID deliberately. Ensure the market exists and belongs to Jaipur. The example **does not execute until an operator runs it**.

```sql
begin;
do $$
declare
  candidate uuid := '00000000-0000-4000-8000-000000000000'; -- Replace
  selected_market text := 'bapu-bazaar';                 -- Verify
  s public.ff_submissions%rowtype;
  observation_id uuid;
begin
  select * into s from public.ff_submissions
  where id = candidate for update;
  if not found or s.status <> 'pending' then
    raise exception 'Pending submission not found';
  end if;
  if s.material = 'unknown' then
    raise exception 'Resolve material before publishing';
  end if;
  if not exists (select 1 from public.ff_markets
                 where id = selected_market and city = s.city and enabled) then
    raise exception 'Verify market and city first';
  end if;

  insert into public.ff_observations
    (category_id,market_id,material,size_cm,finish,segment,price_inr,
     price_type,observed_at,attributes,provenance,source_note,status,reviewed_at)
  values
    (s.category_id,selected_market,s.material,s.size_cm,s.finish,s.segment,
     s.price_inr,s.price_type,s.observed_at,s.attributes,'community',
     'Community observation reviewed by the FairFare pilot operator. Not independently guaranteed.',
     'approved',now())
  returning id into observation_id;

  update public.ff_submissions set status='approved',reviewed_at=now(),
    published_observation_id=observation_id,
    reviewer_note='Product, price type, date, location and evidence reviewed.'
  where id=s.id;
end $$;
commit;
```

To reject, update only the reviewed submission's status, timestamp and reviewer note. Preserve the original reported fields. Never bulk-approve by price alone. Public references intentionally exclude notes/private evidence.

## Retention and maintenance

- Review promptly. Delete private evidence after review or within 90 days, as stated in the pilot privacy notice. This requires operator action; no automatic retention job is installed.
- Remove evidence objects through trusted Storage APIs/Dashboard, then remove their `ff_evidence` metadata. Do not delete Storage database rows directly.
- Sweep uploaded object folders with no matching submission after a suitable grace period. Those can result from an interrupted upload or uncertain backend failure. Inspect before deleting.
- Remove expired quota buckets periodically:

```sql
delete from fairfare_private.ff_rate_limits
where expires_at < now() - interval '2 days';
```

- Before responding to a deletion request, verify the exact submission reference through the pilot operator's established contact route. No contact details are collected by this MVP, and no contact address is invented in the app.
- The two integration fixtures created during implementation are labelled `AUTOMATED QA FIXTURE` in their notes. They must remain rejected, never published.

## Security review

The Supabase security advisor reports INFO notices for RLS-enabled tables with no public policy: submissions, evidence and private quota counters. This is intentional denial of public access, combined with revoked grants. Do not add public policies just to silence these notices. See the [Supabase advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
