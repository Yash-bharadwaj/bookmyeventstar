-- Profile checklist gate: only complete + verified + listed artists appear on public browse queries

alter table public.artist_profiles
  add column if not exists is_profile_complete boolean not null default false;

comment on column public.artist_profiles.is_profile_complete is
  'Automatic checklist (bio, price, categories, cities, photo, extras). Rows must satisfy this plus is_verified and is_listed to show on explore.';

create index if not exists idx_artist_profiles_listed_complete on public.artist_profiles (is_listed, is_profile_complete)
  where is_listed = true and is_profile_complete = true and is_verified = true;

-- Backfill existing rows against current data (photos)
update public.artist_profiles ap
set is_profile_complete = (
    length(trim(coalesce(ap.bio, ''))) >= 20
    and coalesce(ap.base_price, 0) >= 1000
    and cardinality(coalesce(ap.categories, '{}')) >= 1
    and cardinality(coalesce(ap.cities, '{}')) >= 1
    and exists (
      select 1 from public.artist_media m
      where m.artist_id = ap.id and m.type = 'photo'
    )
    and (
      length(trim(coalesce(ap.rider_notes, ''))) >= 10
      or coalesce(ap.social_links->>'instagram', '') ~ '^https?://'
      or coalesce(ap.social_links->>'youtube', '') ~ '^https?://'
    )
  );
