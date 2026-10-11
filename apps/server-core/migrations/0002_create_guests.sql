CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  normalized_name text NOT NULL,
  invitation_status text NOT NULL,
  guest_type text NOT NULL,
  owner_key text NOT NULL,
  internal_notes text NOT NULL DEFAULT '',
  rsvp_status text NOT NULL DEFAULT '',
  rsvp_email text NOT NULL DEFAULT '',
  rsvp_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guests_invitation_status_check CHECK (invitation_status in ('Yes', 'Maybe')),
  CONSTRAINT guests_guest_type_check CHECK (guest_type in ('Church', 'Family', 'Friends', 'Work')),
  CONSTRAINT guests_owner_key_check CHECK (owner_key in ('Kevin', 'Cher')),
  CONSTRAINT guests_rsvp_status_check CHECK (rsvp_status in ('', 'Yes', 'No'))
);

CREATE UNIQUE INDEX IF NOT EXISTS guests_normalized_name_unique ON guests (normalized_name);
CREATE INDEX IF NOT EXISTS guests_invitation_status_idx ON guests (invitation_status);
