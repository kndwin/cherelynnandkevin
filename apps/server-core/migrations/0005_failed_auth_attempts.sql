CREATE TABLE IF NOT EXISTS failed_auth_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_name text NOT NULL CHECK (length(normalized_name) <= 400),
  reason text NOT NULL CHECK (reason IN ('wrong-password', 'name-not-found', 'ineligible')),
  attempt_count bigint NOT NULL DEFAULT 1 CHECK (attempt_count > 0),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'resolved')),
  notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  UNIQUE (normalized_name, reason)
);
CREATE INDEX IF NOT EXISTS failed_auth_attempts_last_seen_idx ON failed_auth_attempts(last_seen_at DESC);
-- No expiry/TTL: entries are retained until explicitly deleted by an admin.
