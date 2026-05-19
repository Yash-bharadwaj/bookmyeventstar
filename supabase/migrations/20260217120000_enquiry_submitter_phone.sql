-- Triage: who is booking (vs high-volume event managers) + proof of verified mobile

alter table public.enquiries
  add column if not exists submitter_type text not null default 'personal'
  check (submitter_type in ('personal', 'company', 'planner'));

alter table public.enquiries
  add column if not exists phone_verified_at timestamptz;

comment on column public.enquiries.submitter_type is
  'personal: individual/family; company: corporate/brand; planner: event agency (triage for spam)';

comment on column public.enquiries.phone_verified_at is
  'Set when enquiry is submitted after mobile OTP verification.';
