-- Control whether an artist appears in client / coordinator browse & shortlist.
-- Admins always see all artists in the admin panel.

alter table public.artist_profiles
  add column if not exists is_listed boolean not null default true;

comment on column public.artist_profiles.is_listed is
  'When false, hidden from clients and coordinators in browse/search; admin still manages the profile.';

create index if not exists idx_artist_profiles_is_listed on public.artist_profiles (is_listed) where (is_listed = true);

-- Allow admins to update artist profiles (verification, listing, etc.)
drop policy if exists "Admin can update artist profiles" on public.artist_profiles;
create policy "Admin can update artist profiles" on public.artist_profiles
  for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');
