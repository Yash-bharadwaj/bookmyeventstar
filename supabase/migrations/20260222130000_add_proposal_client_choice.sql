-- Client's chosen artist from a multi-artist proposal
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS client_chosen_artist_id TEXT,
  ADD COLUMN IF NOT EXISTS client_revision_notes    TEXT;
