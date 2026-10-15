CREATE OR REPLACE FUNCTION audit_guest_rsvp() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor text;
BEGIN
  IF NEW.rsvp_status IS NOT DISTINCT FROM OLD.rsvp_status
    AND NEW.rsvp_email IS NOT DISTINCT FROM OLD.rsvp_email
    AND NEW.rsvp_notes IS NOT DISTINCT FROM OLD.rsvp_notes THEN
    RETURN NEW;
  END IF;
  NEW.rsvp_revision := OLD.rsvp_revision + 1;
  actor := nullif(current_setting('wedding.actor_guest_id', true), '');
  INSERT INTO rsvp_audit(target_guest_id, actor_guest_id, actor_kind, revision, attendance)
    VALUES (NEW.id, actor::uuid, CASE WHEN actor IS NULL THEN 'admin' ELSE 'guest' END,
      NEW.rsvp_revision, NEW.rsvp_status);
  RETURN NEW;
END $$;

CREATE TABLE IF NOT EXISTS sheets_sync_runs (
  id uuid PRIMARY KEY,
  trigger_kind text NOT NULL CHECK (trigger_kind IN ('manual', 'scheduled')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  queued_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  guest_count integer,
  error text
);
CREATE INDEX IF NOT EXISTS sheets_sync_runs_queued_idx ON sheets_sync_runs(queued_at DESC);
CREATE TABLE IF NOT EXISTS sheets_sync_control (
  id integer PRIMARY KEY CHECK (id = 1),
  active_run_id uuid REFERENCES sheets_sync_runs(id),
  lease_owner uuid,
  lease_until timestamptz,
  scheduled_through timestamptz
);
INSERT INTO sheets_sync_control(id) VALUES (1) ON CONFLICT DO NOTHING;
