-- Add follow-up tracking fields to enquiries
-- Allows coordinators to set a next follow-up date and log notes

alter table public.enquiries
  add column if not exists follow_up_date date,
  add column if not exists follow_up_notes text;

-- Index for coordinator dashboard to quickly find today's follow-ups
create index if not exists idx_enquiries_follow_up on public.enquiries(coordinator_id, follow_up_date)
  where follow_up_date is not null;
