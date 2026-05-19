-- Ensure each artist profile has at least one portfolio photo row so the profile-complete gate applies.
-- Seeded/demo artists often lacked artist_media rows, so browse showed only whoever had uploaded media.

insert into public.artist_media (artist_id, type, url, title, is_primary)
select
  ap.id,
  'photo',
  'https://picsum.photos/seed/' || replace(ap.id::text, '-', '') || '/480/480',
  'Portfolio',
  not exists (
    select 1
    from public.artist_media existing
    where existing.artist_id = ap.id
      and existing.type = 'photo'
  )
from public.artist_profiles ap
where not exists (
  select 1
  from public.artist_media m
  where m.artist_id = ap.id
    and m.type = 'photo'
);

-- Align is_profile_complete with app logic: bio, price, categories, cities + ≥1 photo.
-- Optional "extras" (rider/social URLs) contribute to UX % only, not eligibility.

update public.artist_profiles ap
set is_profile_complete = (
    length(trim(coalesce(ap.bio, ''))) >= 20
    and coalesce(ap.base_price, 0) >= 1000
    and cardinality(coalesce(ap.categories, '{}')) >= 1
    and cardinality(coalesce(ap.cities, '{}')) >= 1
    and exists (
      select 1
      from public.artist_media m
      where m.artist_id = ap.id
        and m.type = 'photo'
    )
  );
