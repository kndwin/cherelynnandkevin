import { describe, expect, it } from "vitest";
import { normalizeDisplayName } from "./guest-name.ts";
import { GuestSeedRows } from "./guest.seed.ts";

describe("GuestSeedRows", () => {
  it("contains every supplied row exactly once", () => {
    expect(GuestSeedRows).toHaveLength(158);
    expect(GuestSeedRows[0]?.displayName).toBe("Erick Rajan");
    expect(GuestSeedRows[GuestSeedRows.length - 1]?.displayName).toBe("Zi Ang");
  });

  it("has no normalized-name collisions", () => {
    const seen = new Map<string, string>();
    for (const row of GuestSeedRows) {
      const normalized = normalizeDisplayName(row.displayName);
      expect(normalized.length).toBeGreaterThan(0);
      expect(seen.get(normalized)).toBeUndefined();
      seen.set(normalized, row.displayName);
    }
    expect(seen.size).toBe(GuestSeedRows.length);
  });

  it("uses only valid enums and blank RSVP fields", () => {
    for (const row of GuestSeedRows) {
      expect(["Yes", "Maybe"]).toContain(row.invitationStatus);
      expect(["Church", "Family", "Friends", "Work"]).toContain(row.guestType);
      expect(["Kevin", "Cher"]).toContain(row.ownerKey);
      // Names were trimmed; no leading/trailing or collapsed-whitespace drift.
      expect(row.displayName).toBe(row.displayName.trim().replace(/\s+/g, " "));
    }
  });

  it("preserves the internal note exactly", () => {
    const noted = GuestSeedRows.filter((row) => row.internalNotes.length > 0);
    expect(noted).toHaveLength(1);
    expect(noted[0]?.displayName).toBe("Matthew Niv");
    expect(noted[0]?.internalNotes).toBe("Bouqet of flowers for Judith");
  });

  it("splits invitation status as supplied", () => {
    expect(GuestSeedRows.filter((row) => row.invitationStatus === "Yes")).toHaveLength(108);
    expect(GuestSeedRows.filter((row) => row.invitationStatus === "Maybe")).toHaveLength(50);
  });
});
