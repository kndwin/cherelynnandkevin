CREATE TABLE IF NOT EXISTS guest_relationships (
  guest_a_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  guest_b_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  relationship text NOT NULL CHECK (relationship IN ('Partner', 'Parent', 'Child', 'Sibling', 'Family', 'Other')),
  PRIMARY KEY (guest_a_id, guest_b_id),
  CHECK (guest_a_id < guest_b_id)
);
CREATE TABLE IF NOT EXISTS relationship_migration_markers (name text PRIMARY KEY);
-- The runner replays every file. Record completion even for an empty database:
-- subsequent replays must never restore links an administrator has cleared.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM relationship_migration_markers WHERE name = 'legacy-group-cliques-v1') THEN
    INSERT INTO guest_relationships (guest_a_id, guest_b_id, relationship)
      SELECT a.id, b.id, 'Other' FROM guests a JOIN guests b
        ON a.group_id = b.group_id AND a.id < b.id
      ON CONFLICT DO NOTHING;
    INSERT INTO relationship_migration_markers VALUES ('legacy-group-cliques-v1');
  END IF;
END $$;
