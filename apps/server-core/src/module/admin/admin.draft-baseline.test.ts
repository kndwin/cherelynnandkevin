import { describe, expect, it } from "vitest";
import { changedGuestPatch, reconcileDraft } from "../../../../client-wedding-web/src/module/admin/admin.draft-baseline.ts";

describe("draft RSVP baseline", () => {
  const baseline = { displayName: "Guest", nickname: "", invitationStatus: "Yes", guestType: "Friends", ownerKey: "Kevin", internalNotes: "", rsvpStatus: "", rsvpEmail: "", rsvpNotes: "", facebookGroupAdded: false };
  it("sends only checkbox changes against the retained baseline, including false", () => {
    expect(changedGuestPatch({ ...baseline, facebookGroupAdded: true }, baseline, 1)).toEqual({ facebookGroupAdded: true });
    expect(changedGuestPatch(baseline, { ...baseline, facebookGroupAdded: true }, 1)).toEqual({ facebookGroupAdded: false });
  });
  it("retains the original revision for mixed RSVP and checkbox edits", () => {
    expect(changedGuestPatch({ ...baseline, rsvpStatus: "Yes", facebookGroupAdded: true }, baseline, 1)).toEqual({ rsvpStatus: "Yes", facebookGroupAdded: true, expectedRevision: 1 });
  });
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
