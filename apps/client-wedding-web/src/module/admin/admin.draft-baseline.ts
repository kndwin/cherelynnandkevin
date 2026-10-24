// Keep the revision attached to the snapshot a draft was actually edited from.
export function reconcileDraft<D>(draft: D | undefined, baseline: D | undefined, fresh: D, dirty: (a: D, b: D) => boolean): D {
  return draft !== undefined && baseline !== undefined && dirty(draft, baseline) ? draft : fresh;
}
import type { AdminUpdateGuestRequest } from "@cherelynnandkevin/client-api-contract/admin/http";
type AdminGuestDraft = { [K in Exclude<keyof AdminUpdateGuestRequest, "expectedRevision" | "facebookGroupAdded">]-?: string } & { facebookGroupAdded: boolean };

// Compare to the retained edit snapshot, never a newer background fetch.
export function changedGuestPatch(draft: AdminGuestDraft, baseline: AdminGuestDraft, revision: number | undefined): AdminUpdateGuestRequest {
  const changes: Record<string, string | boolean | number> = Object.fromEntries((Object.keys(draft) as (keyof AdminGuestDraft)[])
    .filter((key) => draft[key] !== baseline[key])
    .map((key) => [key, key === "displayName" || key === "nickname" ? (draft[key] as string).trim() : draft[key]]));
  if (["rsvpStatus", "rsvpEmail", "rsvpNotes"].some((key) => key in changes) && revision !== undefined) changes.expectedRevision = revision;
  return changes as AdminUpdateGuestRequest;
}
