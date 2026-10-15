import { describe, expect, it } from "vitest";
import { reconcileDraft } from "../../../../client-wedding-web/src/module/admin/admin.draft-baseline.ts";

describe("draft RSVP baseline", () => {
  const original = { notes: "original", revision: 1 };
  const external = { notes: "external", revision: 2 };
  const dirty = (a: typeof original, b: typeof original) => a.notes !== b.notes;
  it("refreshes clean drafts with the latest revision", () => {
    expect(reconcileDraft(original, original, external, dirty)).toBe(external);
  });
  it("retains a dirty draft and its original revision after an external RSVP", () => {
    const edited = { notes: "local edit", revision: 1 };
    expect(reconcileDraft(edited, original, external, dirty)).toBe(edited);
    expect(reconcileDraft(edited, original, external, dirty).revision).toBe(1);
  });
});
