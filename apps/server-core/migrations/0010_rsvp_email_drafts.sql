CREATE TABLE IF NOT EXISTS rsvp_email_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL,
  revision integer NOT NULL CHECK (revision >= 0),
  kind text NOT NULL DEFAULT 'rsvp_confirmation' CHECK (kind = 'rsvp_confirmation'),
  status text NOT NULL DEFAULT 'draft_disabled' CHECK (status = 'draft_disabled'),
  template_version integer NOT NULL DEFAULT 1,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rsvp_email_drafts_revision_kind_key UNIQUE (guest_id, revision, kind)
);
