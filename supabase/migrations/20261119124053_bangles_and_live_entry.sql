begin;

insert into public.ff_categories (id, name, enabled, attributes)
values ('bangles','Fashion bangles',true,'{"size_unit":"cm","measurement":"inner diameter","pack_sizes":[1,2,4,6,12]}')
on conflict (id) do nothing;

alter table public.ff_observations drop constraint ff_observations_material_check, drop constraint ff_observations_finish_check;
alter table public.ff_observations
  add constraint ff_observations_product_attributes_check check (
    case when category_id = 'bangles' then (
      material in ('lac','glass','metal','unknown') and finish in ('plain','patterned','stonework')
      and size_cm between 4.5 and 7.5 and coalesce(attributes->>'pack_count' in ('1','2','4','6','12'),false)
    ) else (
      material in ('wood','sandalwood','resin','stone','unknown') and finish in ('plain','painted','inlay','openwork')
    ) end
  );
alter table public.ff_submissions drop constraint ff_submissions_material_check, drop constraint ff_submissions_finish_check;
alter table public.ff_submissions
  add constraint ff_submissions_product_attributes_check check (
    case when category_id = 'bangles' then (
      material in ('lac','glass','metal','unknown') and finish in ('plain','patterned','stonework')
      and size_cm between 4.5 and 7.5 and coalesce(attributes->>'pack_count' in ('1','2','4','6','12'),false)
    ) else (
      material in ('wood','sandalwood','unknown') and finish in ('plain','painted','inlay','openwork')
    ) end
  );

create index ff_bangle_match_idx on public.ff_observations
  (segment, (attributes->>'pack_count'), finish, material, size_cm)
  where category_id = 'bangles' and status = 'approved';

with variants as (
  select diameter, material, design, segment, quantity, sample,
    format('demo-bangles:%s:%s:%s:%s:%s:%s', diameter,material,design,segment,quantity,sample) as key
  from unnest(array[4.5,5,5.5,6,6.5,7,7.5]) diameter
  cross join unnest(array['lac','glass','metal']) material
  cross join unnest(array['plain','patterned','stonework']) design
  cross join unnest(array['street','shop','boutique']) segment
  cross join unnest(array[1,2,4,6,12]) quantity
  cross join generate_series(1,3) sample
)
insert into public.ff_observations
  (id,category_id,market_id,material,size_cm,finish,segment,price_inr,price_type,observed_at,
   attributes,provenance,source_note,source_url,status,reviewed_at,image_path,image_alt,image_kind,image_credit,image_license,independence_key)
select md5(key)::uuid, 'bangles',
  (array['bapu-bazaar','johari-bazaar','nehru-bazaar'])[sample], material, diameter, design, segment,
  greatest(10,round(
    (case material when 'glass' then 25 when 'lac' then 60 else 75 end)
    * (case design when 'patterned' then 1.38 when 'stonework' then 1.95 else 1 end)
    * (case segment when 'street' then 0.82 when 'boutique' then 1.55 else 1 end)
    * (array[0.83,1.00,1.20])[sample]
    * (0.92 + diameter / 70)
    * power(quantity::numeric,0.87)
    / 5) * 5),
  'asking', date '2026-11-19' - sample,
  jsonb_build_object('dataset_version','bangles-v1','pack_count',quantity,
    'width_style',(array['slim','standard','wide'])[sample],
    'size_basis','inner diameter','price_basis','total pack price'),
  'synthetic',
  'Modelled bangle price for the whole stated pack. No seller quote or verified transaction.',
  'https://github.com/FairFareApp/fairfareapp.github.io/blob/main/docs/REFERENCE-DATA.md',
  'approved', now(), format('bangles/%s-%s.webp',material,design),
  format('Generated illustration of a %s %s fashion bangle design',design,material),
  'illustration','FairFare · OpenAI image generation, 19 November 2026',
  'Generated reference illustration; may show a different pack quantity.', key
from variants on conflict (id) do nothing;
commit;
