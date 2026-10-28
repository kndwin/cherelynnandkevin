import { describe, expect, it } from "bun:test";
import { hasDirtyAdminDrafts } from "../src/module/admin/admin.dirty-drafts.ts";
import type { AdminGuestView } from "../src/module/admin/admin.ui.tsx";

const guest: AdminGuestView = {
  id: "first", displayName: "Alex", nickname: "", invitationStatus: "Yes",
  guestType: "Friends", ownerKey: "Cher", facebookGroupAdded: false,
  internalNotes: "", rsvpStatus: "", rsvpEmail: "", rsvpNotes: "",
  createdAt: "2026-01-01", updatedAt: "2026-01-01",
};
const second = { ...guest, id: "second", displayName: "Sam" };

describe("retained guest draft detection", () => {
  it("detects edits on any guest without depending on drawer selection", () => {
    const drafts = { first: guest, second: { ...second, nickname: "Sammy" } };
    expect(hasDirtyAdminDrafts(drafts, [guest, second])).toBe(true);
  });
  it("clears after all drafts match saved guests", () => {
    expect(hasDirtyAdminDrafts({ first: guest, second }, [guest, second])).toBe(false);
  });
  it("handles missing drafts and ignores guests removed from the saved list", () => {
    expect(hasDirtyAdminDrafts({}, [guest])).toBe(false);
    expect(hasDirtyAdminDrafts({ second: { ...second, facebookGroupAdded: true } }, [guest])).toBe(false);
  });
  it("includes the manual Notified boolean in dirty detection", () => {
    expect(hasDirtyAdminDrafts({ first: { ...guest, facebookGroupAdded: true } }, [guest])).toBe(true);
  });
});
