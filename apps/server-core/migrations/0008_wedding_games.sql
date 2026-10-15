CREATE TABLE IF NOT EXISTS wedding_games (
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  puzzle_id text NOT NULL,
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  attempt jsonb NOT NULL,
  PRIMARY KEY (guest_id, puzzle_id)
);
