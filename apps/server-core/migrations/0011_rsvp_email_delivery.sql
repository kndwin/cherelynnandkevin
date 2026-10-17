-- Every migration is rerun on startup. Never promote historical disabled rows.
ALTER TABLE rsvp_email_drafts DROP CONSTRAINT IF EXISTS rsvp_email_drafts_status_check;
ALTER TABLE rsvp_email_drafts ADD CONSTRAINT rsvp_email_drafts_status_check
  CHECK (status IN ('draft_disabled', 'pending', 'sending', 'accepted', 'failed', 'unknown', 'cancelled'));
ALTER TABLE rsvp_email_drafts ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;
ALTER TABLE rsvp_email_drafts ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE rsvp_email_drafts ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
CREATE INDEX IF NOT EXISTS rsvp_email_pending_idx ON rsvp_email_drafts (next_attempt_at) WHERE status = 'pending';
