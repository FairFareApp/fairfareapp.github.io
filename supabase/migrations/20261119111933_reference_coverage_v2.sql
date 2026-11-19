begin;
-- Public, operator-curated illustration metadata. Existing RLS/grants remain unchanged.
alter table public.ff_observations
  add column image_path text,
  add column image_alt text,
  add column image_kind text check(image_kind in ('illustration','photograph')),
  add column image_credit text,
  add column image_license text,
  add column independence_key text;
create unique index ff_observation_independence_idx on public.ff_observations(independence_key);
create index ff_comparison_idx on public.ff_observations(category_id,material,finish,segment,size_cm,observed_at) where status='approved';

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('fairfare-reference-images','fairfare-reference-images',true,1500000,array['image/webp'])
on conflict(id) do nothing;
-- No insert/update/delete policies: uploads are restricted to the service role.
-- The separate fairfare-evidence bucket remains private.

-- 1,440 explicitly synthetic scenarios. No real-world independence or verification is claimed.
-- Cross product: 10 heights, 2 assumed materials, 4 finishes, 3 segments,
-- 2 carving levels, and 3 distinct variations with different locality/size/price/date/style.
with scenarios as (
 select height,material,finish,segment,carving,n,
   'demo-v2:'||height||':'||material||':'||finish||':'||segment||':'||carving||':'||n as seed_key
 from unnest(array[2,4,6,8,10,13,16,20,25,30]) as height
 cross join unnest(array['wood','sandalwood']) as material
 cross join unnest(array['plain','painted','inlay','openwork']) as finish
 cross join unnest(array['street','shop','boutique']) as segment
 cross join unnest(array['simple','detailed']) as carving
 cross join generate_series(1,3) as n
)
insert into public.ff_observations(id,category_id,market_id,material,size_cm,finish,segment,price_inr,price_type,observed_at,attributes,provenance,source_note,source_url,status,reviewed_at,image_path,image_alt,image_kind,image_credit,image_license,independence_key)
select md5(seed_key)::uuid,'wooden_elephant',
 (array['bapu-bazaar','johari-bazaar','nehru-bazaar'])[n],material,
 greatest(2,least(30,height+(n-2)*0.2)),finish,segment,
 round((35+power(height::numeric,1.45)*11)*
   (case material when 'sandalwood' then 3.4 else 1 end)*
   (case finish when 'painted' then 1.2 when 'inlay' then 1.7 when 'openwork' then 2.1 else 1 end)*
   (case segment when 'street' then 0.8 when 'boutique' then 1.6 else 1 end)*
   (case carving when 'detailed' then 1.5 else 1 end)*
   (array[0.90,1.00,1.12])[n]/10)*10,
 'asking',date '2026-11-19'-(n*3+height%7),
 jsonb_build_object('carving_detail',carving,'decorative_style',
   case finish when 'plain' then (array['Natural grain','Carved saddle','Geometric saddle'])[n]
   when 'painted' then (array['Floral saddle','Geometric painted trim','Painted ceremonial pattern'])[n]
   when 'inlay' then (array['Geometric inlay','Floral inlay','Border inlay'])[n]
   else (array['Open lattice','Elephant inside lattice','Carved open arches'])[n] end,
   'dataset_version','demo-v2','material_assumed',true),
 'synthetic',
 'Synthetic demonstration scenario. Price, date, locality and material are modelled, not a real seller quote, independent purchase, researched observation or verified species. Shared finish illustration does not depict this exact example.',
 'https://github.com/FairFareApp/fairfareapp.github.io/blob/main/docs/REFERENCE-DATA.md',
 'approved',now(),'elephants/'||finish||'.webp',
 'AI-generated illustration of a '||finish||' wooden elephant; finish reference only, not a purchase photo or scale reference.',
 'illustration','FairFare · OpenAI image generation, 19 November 2026',
 'AI-generated project asset; no third-party photograph licence. No claim of real purchase.',seed_key
from scenarios
on conflict(id) do nothing;

-- Attach appropriate finish illustrations to the original 29 synthetic records too.
update public.ff_observations set
 image_path='elephants/'||finish||'.webp',
 image_alt='AI-generated '||finish||' wooden elephant illustration; finish reference only, not an actual purchase.',
 image_kind='illustration',image_credit='FairFare · OpenAI image generation, 19 November 2026',
 image_license='AI-generated project asset; no third-party photograph licence. No claim of real purchase.',
 independence_key=coalesce(independence_key,'legacy:'||id::text)
where provenance='synthetic' and category_id='wooden_elephant' and finish in ('plain','painted','inlay','openwork') and image_path is null;

-- A source check is an attempt, not a claim that a current fare was verified.
update public.ff_guidance set checked_at='2026-11-19' where id in ('auto-tariff','amber','hawa','jantar') and verification='unavailable';
commit;
