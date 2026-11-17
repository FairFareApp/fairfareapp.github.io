begin;

create schema if not exists fairfare_private;
revoke all on schema fairfare_private from public, anon, authenticated;
grant usage on schema fairfare_private to service_role;

create table public.ff_categories (
  id text primary key,
  name text not null,
  enabled boolean not null default false,
  attributes jsonb not null default '{}'::jsonb
);
create table public.ff_markets (
  id text primary key,
  city text not null,
  locality text not null,
  enabled boolean not null default false
);
create table public.ff_observations (
  id uuid primary key default gen_random_uuid(),
  category_id text not null references public.ff_categories(id),
  market_id text not null references public.ff_markets(id),
  material text not null check (material in ('wood','sandalwood','resin','stone','unknown')),
  size_cm numeric(5,1) not null check (size_cm between 2 and 60),
  finish text not null check (finish in ('plain','painted','inlay','openwork')),
  segment text not null check (segment in ('street','shop','boutique')),
  price_inr numeric(10,2) not null check (price_inr > 0 and price_inr <= 100000),
  price_type text not null check (price_type in ('asking','paid','observed')),
  observed_at date not null,
  attributes jsonb not null default '{}'::jsonb,
  provenance text not null check (provenance in ('synthetic','researched','community')),
  source_note text not null,
  source_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (status <> 'approved' or reviewed_at is not null)
);
create index ff_match_idx on public.ff_observations(category_id,material,finish,segment,size_cm) where status='approved';
create index ff_observation_market_idx on public.ff_observations(market_id);

create table public.ff_submissions (
  id uuid primary key,
  request_id uuid not null unique,
  kind text not null check (kind in ('contributor','purchase')),
  category_id text not null references public.ff_categories(id),
  city text not null check (city='Jaipur'),
  locality text not null check (char_length(locality) between 2 and 120),
  material text not null check (material in ('wood','sandalwood','unknown')),
  size_cm numeric(5,1) not null check (size_cm between 2 and 30),
  finish text not null check (finish in ('plain','painted','inlay','openwork')),
  segment text not null check (segment in ('street','shop','boutique')),
  price_inr numeric(10,2) not null check (price_inr > 0 and price_inr <= 100000),
  price_type text not null check (price_type in ('asking','paid','observed')),
  observed_at date not null check (observed_at >= '2020-01-01'),
  source_type text not null check (source_type in ('own_purchase','seller_quote','field_observation','receipt')),
  attributes jsonb not null default '{}'::jsonb,
  notes text not null default '' check (char_length(notes) <= 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  image_consent boolean not null default false,
  published_observation_id uuid unique references public.ff_observations(id),
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz not null default now()
);
create index ff_pending_idx on public.ff_submissions(created_at) where status='pending';
create index ff_submission_category_idx on public.ff_submissions(category_id);

create table public.ff_evidence (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.ff_submissions(id) on delete cascade,
  object_path text not null unique,
  purpose text not null check (purpose in ('product','evidence')),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  byte_size integer not null check (byte_size > 0 and byte_size <= 1500000),
  created_at timestamptz not null default now()
);
create index ff_evidence_submission_idx on public.ff_evidence(submission_id);

create table public.ff_guidance (
  id text primary key,
  module text not null check (module in ('taxis','autos','monuments')),
  title text not null,
  content jsonb not null,
  source_url text not null,
  checked_at date not null,
  verification text not null check (verification in ('official','guidance','unavailable')),
  published boolean not null default false
);

alter table public.ff_categories enable row level security;
alter table public.ff_markets enable row level security;
alter table public.ff_observations enable row level security;
alter table public.ff_submissions enable row level security;
alter table public.ff_evidence enable row level security;
alter table public.ff_guidance enable row level security;

revoke all on public.ff_categories, public.ff_markets, public.ff_observations, public.ff_submissions, public.ff_evidence, public.ff_guidance from anon, authenticated;
grant select on public.ff_categories, public.ff_markets, public.ff_observations, public.ff_guidance to anon, authenticated;
grant all on public.ff_categories, public.ff_markets, public.ff_observations, public.ff_submissions, public.ff_evidence, public.ff_guidance to service_role;
create policy ff_categories_read on public.ff_categories for select to anon, authenticated using (enabled);
create policy ff_markets_read on public.ff_markets for select to anon, authenticated using (enabled);
create policy ff_observations_read on public.ff_observations for select to anon, authenticated using (status='approved');
create policy ff_guidance_read on public.ff_guidance for select to anon, authenticated using (published);

create table fairfare_private.ff_rate_limits (
  bucket text primary key,
  hits integer not null,
  expires_at timestamptz not null
);
alter table fairfare_private.ff_rate_limits enable row level security;
grant all on fairfare_private.ff_rate_limits to service_role;

-- Invoker rights: only service_role can execute or reach the private table.
create function public.ff_take_quota(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then return false; end if;
  insert into fairfare_private.ff_rate_limits(bucket,hits,expires_at)
  values(p_bucket,1,now()+make_interval(secs=>p_window_seconds))
  on conflict(bucket) do update set
    hits=case when fairfare_private.ff_rate_limits.expires_at < now() then 1 else fairfare_private.ff_rate_limits.hits+1 end,
    expires_at=case when fairfare_private.ff_rate_limits.expires_at < now() then now()+make_interval(secs=>p_window_seconds) else fairfare_private.ff_rate_limits.expires_at end
  returning hits into n;
  return n <= p_limit;
end;
$$;
revoke all on function public.ff_take_quota(text,integer,integer) from public,anon,authenticated;
grant execute on function public.ff_take_quota(text,integer,integer) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('fairfare-evidence','fairfare-evidence',false,1500000,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

insert into public.ff_categories(id,name,enabled,attributes) values
('wooden_elephant','Carved wooden elephant',true,'{"size_unit":"cm","pilot_max_cm":30}') on conflict do nothing;
insert into public.ff_markets(id,city,locality,enabled) values
('bapu-bazaar','Jaipur','Bapu Bazaar',true),
('johari-bazaar','Jaipur','Johari Bazaar',true),
('nehru-bazaar','Jaipur','Nehru Bazaar',true) on conflict do nothing;

-- Explicitly synthetic fixtures, not researched purchases or merchant records.
insert into public.ff_observations(category_id,market_id,material,size_cm,finish,segment,price_inr,price_type,observed_at,provenance,source_note,status,reviewed_at)
select 'wooden_elephant', m, 'wood', s, f, seg, p, 'asking', date '2026-11-17', 'synthetic',
 'Synthetic pilot fixture. Illustrative only, not a verified purchase or seller quotation.', 'approved', now()
from (values
('bapu-bazaar',8,'plain','street',180),('johari-bazaar',9,'plain','street',220),('nehru-bazaar',10,'plain','street',250),
('bapu-bazaar',10,'plain','street',280),('johari-bazaar',11,'plain','street',300),('nehru-bazaar',12,'plain','street',340),
('bapu-bazaar',8,'plain','shop',260),('johari-bazaar',9,'plain','shop',300),('nehru-bazaar',10,'plain','shop',340),
('bapu-bazaar',10,'plain','shop',380),('johari-bazaar',11,'plain','shop',420),('nehru-bazaar',12,'plain','shop',460),
('bapu-bazaar',8,'painted','shop',320),('johari-bazaar',9,'painted','shop',360),('nehru-bazaar',10,'painted','shop',400),
('bapu-bazaar',10,'painted','shop',450),('johari-bazaar',11,'painted','shop',480),('nehru-bazaar',12,'painted','shop',540),
('bapu-bazaar',14,'plain','shop',480),('johari-bazaar',15,'plain','shop',550),('nehru-bazaar',16,'plain','shop',600),
('bapu-bazaar',17,'plain','shop',650),('johari-bazaar',18,'plain','shop',720),('nehru-bazaar',19,'plain','shop',800),
('bapu-bazaar',9,'openwork','boutique',900),('johari-bazaar',10,'openwork','boutique',1100),('nehru-bazaar',11,'openwork','boutique',1250),
('bapu-bazaar',10,'openwork','boutique',1400),('johari-bazaar',12,'openwork','boutique',1600)
) as fixtures(m,s,f,seg,p);

insert into public.ff_guidance(id,module,title,content,source_url,checked_at,verification,published) values
('auto-tariff','autos','Local fare references','{"availability":"unavailable","note":"The official fare index lists historical notifications. A current Jaipur meter tariff has not been verified. No rupee estimate is shown."}', 'https://transport.rajasthan.gov.in/content/transportportal/en/transport/farefeesandtax/vehicleFareRateList.html','2026-11-17','unavailable',true),
('amber','monuments','Amber Palace','{"locality":"Amer","fee_inr":null,"note":"Current entry fees could not be verified from the official booking portal. Check your visitor category before paying."}','https://obms-tourist.rajasthan.gov.in/','2026-11-17','unavailable',true),
('hawa','monuments','Hawa Mahal','{"locality":"Old Jaipur","fee_inr":null,"note":"Entry, exterior viewing and guide services are different purchases. Verify the current ticket at the official portal or counter."}','https://obms-tourist.rajasthan.gov.in/','2026-11-17','unavailable',true),
('jantar','monuments','Jantar Mantar','{"locality":"Near City Palace","fee_inr":null,"note":"Verify Indian, foreign visitor and student eligibility. Guide services are optional and should be priced separately."}','https://obms-tourist.rajasthan.gov.in/','2026-11-17','unavailable',true);
commit;
