ALTER TABLE guests ADD COLUMN IF NOT EXISTS facebook_group_added boolean NOT NULL DEFAULT false;
