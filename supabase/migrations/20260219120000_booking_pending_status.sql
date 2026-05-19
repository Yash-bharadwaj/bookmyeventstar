-- Add 'pending' status to bookings (artist confirmation required before confirmed)
-- Add cancellation_reason for tracking why bookings were cancelled

-- 1. Drop existing status constraint
alter table public.bookings drop constraint if exists bookings_status_check;

-- 2. Add updated constraint including 'pending'
alter table public.bookings
  add constraint bookings_status_check
  check (status in ('pending','confirmed','in_progress','completed','cancelled'));

-- 3. Change default to 'pending' so new bookings await artist confirmation
alter table public.bookings alter column status set default 'pending';

-- 4. Add cancellation_reason column
alter table public.bookings add column if not exists cancellation_reason text;

-- 5. Add artist_notification_sent flag to avoid duplicate notifications
alter table public.bookings add column if not exists artist_notified boolean not null default false;
