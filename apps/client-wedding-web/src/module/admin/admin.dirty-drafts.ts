import type { AdminGuestDraft, AdminGuestView } from "./admin.ui.tsx";

export const isAdminDraftDirty = (draft: AdminGuestDraft, guest: AdminGuestView): boolean =>
  (Object.keys(draft) as (keyof AdminGuestDraft)[]).some((key) => draft[key] !== guest[key]);

export const hasDirtyAdminDrafts = (
  drafts: Readonly<Record<string, AdminGuestDraft>>,
  guests: readonly AdminGuestView[],
): boolean => guests.some((guest) => {
  const draft = drafts[guest.id];
  return draft !== undefined && isAdminDraftDirty(draft, guest);
});
