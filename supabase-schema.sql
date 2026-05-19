-- ============================================================
-- BookMyEventStar — Complete Supabase Schema
-- Run this in your Supabase SQL editor (supabase.com/dashboard)
-- ============================================================

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for fuzzy search

-- ============================================================
-- TABLES
-- ============================================================

-- 1. Users
create table if not exists public.users (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  email text not null unique,
  phone text,
  role text not null default 'client'
    check (role in ('admin', 'coordinator', 'artist', 'client')),
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Categories
create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  icon text,
  description text,
  created_at timestamptz not null default now()
);

-- 3. Cities
create table if not exists public.cities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  state text not null,
  created_at timestamptz not null default now()
);

-- 4. Artist Profiles
create table if not exists public.artist_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references public.users on delete cascade,
  bio text default '',
  categories text[] default '{}',
  cities text[] default '{}',
  base_price numeric(12,2) default 0,
  pricing_details jsonb default '{}',
  rating numeric(3,2) default 0 check (rating >= 0 and rating <= 5),
  total_bookings integer default 0,
  is_verified boolean default false,
  is_listed boolean not null default true,
  is_profile_complete boolean not null default false,
  social_links jsonb default '{}',
  rider_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Artist Media
create table if not exists public.artist_media (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid not null references public.artist_profiles on delete cascade,
  type text not null check (type in ('photo', 'video')),
  url text not null,
  title text,
  is_primary boolean default false,
  created_at timestamptz not null default now()
);

-- 6. Artist Documents
create table if not exists public.artist_documents (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid not null references public.artist_profiles on delete cascade,
  type text not null,
  url text not null,
  is_verified boolean default false,
  created_at timestamptz not null default now()
);

-- 7. Availability
create table if not exists public.availability (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid not null references public.artist_profiles on delete cascade,
  date date not null,
  status text not null default 'available'
    check (status in ('available', 'booked', 'blocked')),
  created_at timestamptz not null default now(),
  unique (artist_id, date)
);

-- 8. Enquiries
create table if not exists public.enquiries (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.users on delete set null,
  coordinator_id uuid references public.users on delete set null,
  event_type text not null,
  event_date date not null,
  location text not null,
  city text not null,
  budget_min numeric(12,2) not null default 0,
  budget_max numeric(12,2) not null default 0,
  artist_preference text,
  other_requirements text,
  status text not null default 'new'
    check (status in ('new','assigned','requirement_gathering','shortlisting',
                      'proposal_sent','confirmed','in_progress','completed','cancelled')),
  source text not null default 'website'
    check (source in ('website','whatsapp','email','instagram','referral','walk_in')),
  submitter_type text not null default 'personal'
    check (submitter_type in ('personal','company','planner')),
  phone_verified_at timestamptz,
  follow_up_date date,
  follow_up_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. Proposals
create table if not exists public.proposals (
  id uuid primary key default uuid_generate_v4(),
  enquiry_id uuid not null references public.enquiries on delete cascade,
  coordinator_id uuid references public.users on delete set null,
  content text default '',
  artists_proposed jsonb default '[]',
  quoted_price numeric(12,2) default 0,
  validity_date date,
  status text not null default 'draft'
    check (status in ('draft','sent','accepted','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 10. Bookings
create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  enquiry_id uuid references public.enquiries on delete set null,
  artist_id uuid references public.artist_profiles on delete set null,
  coordinator_id uuid references public.users on delete set null,
  event_date date not null,
  venue text not null,
  city text not null,
  advance_amount numeric(12,2) default 0,
  total_amount numeric(12,2) default 0,
  balance_amount numeric(12,2) generated always as (total_amount - advance_amount) stored,
  status text not null default 'pending'
    check (status in ('pending','confirmed','in_progress','completed','cancelled')),
  cancellation_reason text,
  special_requirements text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 11. Tasks
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references public.bookings on delete cascade,
  type text not null
    check (type in ('artist_confirmation','travel_stay','technical','payment_docs','hospitality')),
  status text not null default 'pending'
    check (status in ('pending','in_progress','done')),
  notes text,
  due_date date,
  assigned_to uuid references public.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 12. Payments
create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references public.bookings on delete cascade,
  type text not null check (type in ('advance','final','artist_settlement')),
  amount numeric(12,2) not null,
  status text not null default 'pending'
    check (status in ('pending','paid','failed')),
  notes text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- 13. Feedback
create table if not exists public.feedback (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references public.bookings on delete cascade,
  client_id uuid references public.users on delete set null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now()
);

-- 14. Notifications
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info'
    check (type in ('info','success','warning','error')),
  is_read boolean default false,
  link text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_enquiries_status on public.enquiries(status);
create index if not exists idx_enquiries_client on public.enquiries(client_id);
create index if not exists idx_enquiries_coordinator on public.enquiries(coordinator_id);
create index if not exists idx_enquiries_date on public.enquiries(event_date);
create index if not exists idx_bookings_status on public.bookings(status);
create index if not exists idx_bookings_artist on public.bookings(artist_id);
create index if not exists idx_bookings_coordinator on public.bookings(coordinator_id);
create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_notifications_unread on public.notifications(user_id, is_read);
create index if not exists idx_availability_artist_date on public.availability(artist_id, date);
create index if not exists idx_artist_profiles_categories on public.artist_profiles using gin(categories);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.users enable row level security;
alter table public.artist_profiles enable row level security;
alter table public.artist_media enable row level security;
alter table public.artist_documents enable row level security;
alter table public.availability enable row level security;
alter table public.enquiries enable row level security;
alter table public.proposals enable row level security;
alter table public.bookings enable row level security;
alter table public.tasks enable row level security;
alter table public.payments enable row level security;
alter table public.feedback enable row level security;
alter table public.notifications enable row level security;
alter table public.categories enable row level security;
alter table public.cities enable row level security;

-- Helper function to get current user role
create or replace function public.get_user_role()
returns text
language sql stable
as $$
  select role from public.users where id = auth.uid();
$$;

-- ---- USERS ----
create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);
create policy "Admin and coordinator can view all users" on public.users
  for select using (public.get_user_role() in ('admin', 'coordinator'));
create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);
create policy "Anyone can insert (registration)" on public.users
  for insert with check (true);

-- ---- ARTIST PROFILES ----
create policy "Anyone can view artist profiles" on public.artist_profiles
  for select using (true);
create policy "Artist can update own profile" on public.artist_profiles
  for update using (auth.uid() = user_id);
create policy "Artist can insert own profile" on public.artist_profiles
  for insert with check (auth.uid() = user_id);
create policy "Admin can update artist profiles" on public.artist_profiles
  for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

-- ---- ARTIST MEDIA ----
create policy "Anyone can view artist media" on public.artist_media
  for select using (true);
create policy "Artist can manage own media" on public.artist_media
  for all using (
    artist_id in (select id from public.artist_profiles where user_id = auth.uid())
  );

-- ---- ARTIST DOCUMENTS ----
create policy "Artist can view own documents" on public.artist_documents
  for select using (
    artist_id in (select id from public.artist_profiles where user_id = auth.uid())
    or public.get_user_role() in ('admin', 'coordinator')
  );
create policy "Artist can manage own documents" on public.artist_documents
  for all using (
    artist_id in (select id from public.artist_profiles where user_id = auth.uid())
  );

-- ---- AVAILABILITY ----
create policy "Anyone can view availability" on public.availability
  for select using (true);
create policy "Artist can manage own availability" on public.availability
  for all using (
    artist_id in (select id from public.artist_profiles where user_id = auth.uid())
  );

-- ---- ENQUIRIES ----
create policy "Client can view own enquiries" on public.enquiries
  for select using (client_id = auth.uid());
create policy "Coordinator can view assigned enquiries" on public.enquiries
  for select using (coordinator_id = auth.uid() or public.get_user_role() = 'admin');
create policy "Admin can view all enquiries" on public.enquiries
  for select using (public.get_user_role() = 'admin');
create policy "Anyone can create enquiry" on public.enquiries
  for insert with check (true);
create policy "Admin and coordinator can update enquiries" on public.enquiries
  for update using (public.get_user_role() in ('admin', 'coordinator'));

-- ---- PROPOSALS ----
create policy "Client can view proposals for their enquiries" on public.proposals
  for select using (
    enquiry_id in (select id from public.enquiries where client_id = auth.uid())
  );
create policy "Coordinator can manage their proposals" on public.proposals
  for all using (coordinator_id = auth.uid() or public.get_user_role() = 'admin');

-- ---- BOOKINGS ----
create policy "Artist can view own bookings" on public.bookings
  for select using (
    artist_id in (select id from public.artist_profiles where user_id = auth.uid())
  );
create policy "Coordinator and admin can manage bookings" on public.bookings
  for all using (
    coordinator_id = auth.uid() or public.get_user_role() = 'admin'
  );
create policy "Client can view bookings for their enquiries" on public.bookings
  for select using (
    enquiry_id in (select id from public.enquiries where client_id = auth.uid())
  );

-- ---- TASKS ----
create policy "Coordinator and admin can manage tasks" on public.tasks
  for all using (public.get_user_role() in ('admin', 'coordinator'));

-- ---- PAYMENTS ----
create policy "Coordinator and admin can view/manage payments" on public.payments
  for all using (public.get_user_role() in ('admin', 'coordinator'));
create policy "Artist can view own payment settlements" on public.payments
  for select using (
    booking_id in (
      select id from public.bookings
      where artist_id in (select id from public.artist_profiles where user_id = auth.uid())
    )
    and type = 'artist_settlement'
  );

-- ---- FEEDBACK ----
create policy "Anyone can view feedback" on public.feedback
  for select using (true);
create policy "Client can create feedback for own bookings" on public.feedback
  for insert with check (client_id = auth.uid());

-- ---- NOTIFICATIONS ----
create policy "User can view own notifications" on public.notifications
  for select using (user_id = auth.uid());
create policy "User can update own notifications" on public.notifications
  for update using (user_id = auth.uid());
create policy "System can insert notifications" on public.notifications
  for insert with check (true);

-- ---- CATEGORIES / CITIES (public read) ----
create policy "Anyone can view categories" on public.categories
  for select using (true);
create policy "Admin can manage categories" on public.categories
  for all using (public.get_user_role() = 'admin');
create policy "Anyone can view cities" on public.cities
  for select using (true);
create policy "Admin can manage cities" on public.cities
  for all using (public.get_user_role() = 'admin');

-- ============================================================
-- AUTO-TASKS TRIGGER (creates checklist when booking is made)
-- ============================================================
create or replace function public.create_booking_tasks()
returns trigger language plpgsql as $$
begin
  insert into public.tasks (booking_id, type, status) values
    (new.id, 'artist_confirmation', 'pending'),
    (new.id, 'travel_stay', 'pending'),
    (new.id, 'technical', 'pending'),
    (new.id, 'payment_docs', 'pending'),
    (new.id, 'hospitality', 'pending');
  return new;
end;
$$;

create trigger booking_tasks_trigger
  after insert on public.bookings
  for each row execute function public.create_booking_tasks();

-- ============================================================
-- UPDATE ARTIST RATING TRIGGER
-- ============================================================
create or replace function public.update_artist_rating()
returns trigger language plpgsql as $$
declare
  avg_rating numeric;
  booking_artist_id uuid;
begin
  select artist_id into booking_artist_id from public.bookings where id = new.booking_id;
  select avg(f.rating) into avg_rating
  from public.feedback f
  join public.bookings b on b.id = f.booking_id
  where b.artist_id = booking_artist_id;
  update public.artist_profiles
  set rating = coalesce(avg_rating, 0), total_bookings = total_bookings + 1
  where id = booking_artist_id;
  return new;
end;
$$;

create trigger artist_rating_trigger
  after insert on public.feedback
  for each row execute function public.update_artist_rating();

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger set_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger set_artist_profiles_updated_at before update on public.artist_profiles
  for each row execute function public.set_updated_at();
create trigger set_enquiries_updated_at before update on public.enquiries
  for each row execute function public.set_updated_at();
create trigger set_proposals_updated_at before update on public.proposals
  for each row execute function public.set_updated_at();
create trigger set_bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

-- ============================================================
-- SEED DATA
-- ============================================================

-- Categories
insert into public.categories (name, icon, description) values
  ('Bollywood Singer', '🎤', 'Popular Bollywood playback singers and live performers'),
  ('Classical Singer', '🎵', 'Hindustani and Carnatic classical vocalists'),
  ('Ghazal Singer', '🎼', 'Soulful ghazal performers'),
  ('Sufi Singer', '🕌', 'Sufi music performers'),
  ('DJ', '🎧', 'Professional DJs for parties and events'),
  ('Band', '🎸', 'Live bands — rock, jazz, fusion, etc.'),
  ('Comedian', '😂', 'Stand-up comedians and comedy acts'),
  ('Anchor / Emcee', '🎙️', 'Professional anchors and event hosts'),
  ('Dance Troupe', '💃', 'Dance groups and solo performers'),
  ('Magician', '🪄', 'Magicians and illusionists'),
  ('Instrumentalist', '🎹', 'Solo instrumentalists — piano, violin, flute, etc.'),
  ('Motivational Speaker', '📣', 'Corporate and motivational speakers'),
  ('Folk Artist', '🥁', 'Regional folk artists and performers'),
  ('Mimicry Artist', '🎭', 'Impressionists and mimicry performers')
on conflict do nothing;

-- Cities
insert into public.cities (name, state) values
  ('Mumbai', 'Maharashtra'),('Delhi', 'Delhi'),('Bengaluru', 'Karnataka'),
  ('Hyderabad', 'Telangana'),('Chennai', 'Tamil Nadu'),('Kolkata', 'West Bengal'),
  ('Pune', 'Maharashtra'),('Ahmedabad', 'Gujarat'),('Jaipur', 'Rajasthan'),
  ('Surat', 'Gujarat'),('Lucknow', 'Uttar Pradesh'),('Chandigarh', 'Punjab'),
  ('Kochi', 'Kerala'),('Indore', 'Madhya Pradesh'),('Bhopal', 'Madhya Pradesh'),
  ('Nagpur', 'Maharashtra'),('Visakhapatnam', 'Andhra Pradesh'),
  ('Coimbatore', 'Tamil Nadu'),('Gurgaon', 'Haryana'),('Noida', 'Uttar Pradesh')
on conflict do nothing;

-- Enable realtime for notifications and enquiries
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.enquiries;
alter publication supabase_realtime add table public.bookings;

-- ============================================================
-- MESSAGES TABLE (coordinator-client chat)
-- ============================================================
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  enquiry_id uuid not null references public.enquiries on delete cascade,
  sender_id uuid not null references public.users on delete cascade,
  sender_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_enquiry on public.messages(enquiry_id);
alter table public.messages enable row level security;

create policy "Participants can view messages" on public.messages
  for select using (
    enquiry_id in (
      select id from public.enquiries
      where client_id = auth.uid() or coordinator_id = auth.uid()
    )
  );

create policy "Participants can send messages" on public.messages
  for insert with check (
    sender_id = auth.uid() and
    enquiry_id in (
      select id from public.enquiries
      where client_id = auth.uid() or coordinator_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.messages;
