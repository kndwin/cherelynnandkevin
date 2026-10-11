import { GuestSeedRows } from "@/module/check-in/guest.seed.ts";
import { normalizeDisplayName } from "@/module/check-in/guest-name.ts";

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined) {
  throw new Error("DATABASE_URL is required");
}

// Deterministic insert-only seed. Detects normalized-name collisions in the
// dataset before touching the database, then inserts only missing normalized
// names (ON CONFLICT DO NOTHING). Source columns and RSVP columns of existing
// rows — including admin edits — are never overwritten, so reruns are safe at
// any time.
const seen = new Map<string, string>();
for (const row of GuestSeedRows) {
  const normalized = normalizeDisplayName(row.displayName);
  if (normalized.length === 0) {
    throw new Error(`Blank guest name in seed dataset`);
  }
  const existing = seen.get(normalized);
  if (existing !== undefined) {
    throw new Error(`Normalized-name collision in seed dataset: "${existing}" vs "${row.displayName}"`);
  }
  seen.set(normalized, row.displayName);
}

const db = new Bun.SQL(databaseUrl);

await db.begin(async (tx) => {
  for (const row of GuestSeedRows) {
    await tx`
      INSERT INTO guests (display_name, normalized_name, invitation_status, guest_type, owner_key, internal_notes)
      VALUES (
        ${row.displayName},
        ${normalizeDisplayName(row.displayName)},
        ${row.invitationStatus},
        ${row.guestType},
        ${row.ownerKey},
        ${row.internalNotes}
      )
      ON CONFLICT (normalized_name) DO NOTHING
    `;
  }
});

const [{ total }] = await db`SELECT count(*)::int AS total FROM guests`;

await db.close();
console.log(`Seed applied: ${GuestSeedRows.length} source rows, ${total} guests total`);
