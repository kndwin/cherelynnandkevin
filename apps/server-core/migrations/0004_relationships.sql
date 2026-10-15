CREATE TABLE IF NOT EXISTS guest_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200)
);
ALTER TABLE guests ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES guest_groups(id) ON DELETE SET NULL;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS rsvp_revision integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS guests_group_id_idx ON guests(group_id);
CREATE TABLE IF NOT EXISTS rsvp_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_guest_id uuid NOT NULL,
  actor_guest_id uuid,
  actor_kind text NOT NULL CHECK (actor_kind IN ('guest', 'admin')),
  revision integer NOT NULL,
  attendance text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION audit_guest_rsvp() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor text;
BEGIN
  NEW.rsvp_revision := OLD.rsvp_revision + 1;
  actor := nullif(current_setting('wedding.actor_guest_id', true), '');
  INSERT INTO rsvp_audit(target_guest_id, actor_guest_id, actor_kind, revision, attendance)
    VALUES (NEW.id, actor::uuid, CASE WHEN actor IS NULL THEN 'admin' ELSE 'guest' END,
      NEW.rsvp_revision, NEW.rsvp_status);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guests_rsvp_audit ON guests;
CREATE TRIGGER guests_rsvp_audit BEFORE UPDATE OF rsvp_status, rsvp_email, rsvp_notes ON guests
  FOR EACH ROW EXECUTE FUNCTION audit_guest_rsvp();
