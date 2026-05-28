-- Event manager fields on users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_event_manager BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS company_name      TEXT,
  ADD COLUMN IF NOT EXISTS instagram_handle  TEXT,
  ADD COLUMN IF NOT EXISTS website_url       TEXT;
