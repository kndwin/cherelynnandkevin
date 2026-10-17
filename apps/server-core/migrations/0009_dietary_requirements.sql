ALTER TABLE guests ADD COLUMN IF NOT EXISTS dietary_requirements text NOT NULL DEFAULT '';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'guests_dietary_requirements_length' AND conrelid = 'guests'::regclass) THEN
    ALTER TABLE guests ADD CONSTRAINT guests_dietary_requirements_length CHECK (length(dietary_requirements) <= 1000);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION audit_guest_rsvp() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor text;
BEGIN
  IF NEW.rsvp_status IS NOT DISTINCT FROM OLD.rsvp_status
    AND NEW.rsvp_email IS NOT DISTINCT FROM OLD.rsvp_email
    AND NEW.rsvp_notes IS NOT DISTINCT FROM OLD.rsvp_notes
    AND NEW.dietary_requirements IS NOT DISTINCT FROM OLD.dietary_requirements THEN
    RETURN NEW;
  END IF;
  NEW.rsvp_revision := OLD.rsvp_revision + 1;
  actor := nullif(current_setting('wedding.actor_guest_id', true), '');
  INSERT INTO rsvp_audit(target_guest_id, actor_guest_id, actor_kind, revision, attendance)
    VALUES (NEW.id, actor::uuid, CASE WHEN actor IS NULL THEN 'admin' ELSE 'guest' END,
      NEW.rsvp_revision, NEW.rsvp_status);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guests_rsvp_audit ON guests;
CREATE TRIGGER guests_rsvp_audit BEFORE UPDATE OF rsvp_status, rsvp_email, rsvp_notes, dietary_requirements ON guests
  FOR EACH ROW EXECUTE FUNCTION audit_guest_rsvp();
