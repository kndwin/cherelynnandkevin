import { useCallback, useEffect, useRef, useState } from "react";
import { reconcileDraft } from "./admin.draft-baseline.ts";
import { toast } from "sonner";
import { useAdminSession } from "./admin.layout.tsx";
import type { AdminGuest, AdminRelationship, AdminRelationshipRequest } from "@cherelynnandkevin/client-api-contract/admin/http";
import { listRelationships, saveRelationship, getGuest } from "./admin.api.ts";
import { AdminRelationships } from "./admin.relationships.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet.tsx";
import {
  AdminApiError,
  createGuest,
  deleteGuest,
  listGuests,
  updateGuest,
} from "./admin.api.ts";
import { AdminGuestsView, isAdminDraftDirty, validateAdminDraft } from "./admin.ui.tsx";
import type { AdminGuestDraft, AdminRowState } from "./admin.ui.tsx";

const PageSize = 1000;

const emptyDraft: AdminGuestDraft = {
  displayName: "",
  nickname: "",
  invitationStatus: "Yes",
  guestType: "Church",
  ownerKey: "Cher",
  internalNotes: "",
  rsvpStatus: "",
  rsvpEmail: "",
  rsvpNotes: "",
};

const toDraft = (guest: AdminGuest): AdminGuestDraft => ({
  displayName: guest.displayName,
  nickname: guest.nickname ?? "",
  invitationStatus: guest.invitationStatus,
  guestType: guest.guestType,
  ownerKey: guest.ownerKey,
  internalNotes: guest.internalNotes,
  rsvpStatus: guest.rsvpStatus,
  rsvpEmail: guest.rsvpEmail,
  rsvpNotes: guest.rsvpNotes,
});

const AdminPanel = () => {
  const expireSession = useAdminSession();

  const [guests, setGuests] = useState<ReadonlyArray<AdminGuest>>([]);
  const [relationships, setRelationships] = useState<readonly AdminRelationship[]>([]);
  const [manageGroups, setManageGroups] = useState(false);
  const [membershipBusy, setMembershipBusy] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listMessage, setListMessage] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<Readonly<Record<string, AdminGuestDraft>>>({});
  const baselines = useRef<Record<string, AdminGuest>>({});
  const [rowStates, setRowStates] = useState<Readonly<Record<string, AdminRowState>>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [newDraft, setNewDraft] = useState<AdminGuestDraft>(emptyDraft);
  const [newSaving, setNewSaving] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    setListMessage(null);
    try {
      setRelationships(await listRelationships());
      const first = await listGuests({
        page: 1,
        pageSize: PageSize,
      });
      const allGuests = [...first.guests];
      for (let next = 2; allGuests.length < first.total; next++) {
        const batch = await listGuests({ page: next, pageSize: PageSize });
        if (batch.guests.length === 0) break;
        allGuests.push(...batch.guests);
      }
      const result = { ...first, guests: allGuests };
      setGuests(result.guests);
      setTotal(result.total);
      // Preserve in-progress edits for rows that are still visible; only
      // initialize drafts for newly seen rows and prune rows that left.
      setDrafts((current) => {
        const next: Record<string, AdminGuestDraft> = {};
        for (const guest of result.guests) {
          const baseline = baselines.current[guest.id];
          const fresh = toDraft(guest);
          next[guest.id] = reconcileDraft(current[guest.id], baseline ? toDraft(baseline) : undefined, fresh,
            (a, b) => isAdminDraftDirty(a, { ...guest, ...b }));
          if (next[guest.id] === fresh) baselines.current[guest.id] = guest;
        }
        return next;
      });
      setRowStates((current) => {
        const next: Record<string, AdminRowState> = {};
        for (const guest of result.guests) {
          if (current[guest.id] !== undefined) {
            next[guest.id] = current[guest.id];
          }
        }
        return next;
      });
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) {
        expireSession(error.message);
      } else {
        const message = error instanceof Error ? error.message : "Could not load guests.";
        setListMessage(message);
      }
    } finally {
      setLoading(false);
    }
  }, [expireSession]);

  useEffect(() => {
    void fetchGuests();
  }, [fetchGuests]);

  const handleDraftChange = (id: string, field: keyof AdminGuestDraft, value: string) => {
    setDrafts((current) => {
      const existing = current[id];
      if (existing === undefined) {
        return current;
      }
      return { ...current, [id]: { ...existing, [field]: value } };
    });
    // Any edit clears the saved/error banner for that row so dirty state is
    // unambiguous; errors reappear on the next save attempt.
    setRowStates((current) => {
      const existing = current[id];
      if (existing === undefined || (existing.status === "idle" && existing.error === null)) {
        return current;
      }
      if (existing.status === "saving") {
        return current;
      }
      return { ...current, [id]: { status: "idle", error: null } };
    });
  };

  const handleSave = (id: string) => {
    if (membershipBusy || loading) return;
    const server = guests.find((entry) => entry.id === id);
    const draft = drafts[id];
    if (server === undefined || draft === undefined) {
      return;
    }
    if (!isAdminDraftDirty(draft, { ...server, ...toDraft(server) })) {
      return;
    }
    const validationError = validateAdminDraft(draft);
    const baseline = baselines.current[id];
    if (baseline?.rsvpRevision === undefined) {
      const message = "RSVP revision is missing. Reload the guest list before saving; your edits have not been saved.";
      toast.error(message);
      setRowStates((current) => ({ ...current, [id]: { status: "error", error: message } }));
      return;
    }
    if (validationError !== null) {
      setRowStates((current) => ({ ...current, [id]: { status: "error", error: validationError } }));
      return;
    }
    setRowStates((current) => ({ ...current, [id]: { status: "saving", error: null } }));
    updateGuest(id, {
      expectedRevision: baseline.rsvpRevision,
      displayName: draft.displayName.trim(),
      nickname: draft.nickname.trim(),
      invitationStatus: draft.invitationStatus as "Yes" | "Maybe",
      guestType: draft.guestType as "Church" | "Family" | "Friends" | "Work",
      ownerKey: draft.ownerKey as "Kevin" | "Cher",
      internalNotes: draft.internalNotes,
      rsvpStatus: draft.rsvpStatus as "" | "Yes" | "No",
      rsvpEmail: draft.rsvpEmail,
      rsvpNotes: draft.rsvpNotes,
    })
      .then((updated) => {
        baselines.current[id] = updated;
        toast.success("Guest saved");
        setGuests((current) => current.map((entry) => (entry.id === id ? updated : entry)));
        setDrafts((current) => ({ ...current, [id]: toDraft(updated) }));
        setRowStates((current) => ({ ...current, [id]: { status: "saved", error: null } }));
      })
      .catch((error: unknown) => {
        if (error instanceof AdminApiError && error.status === 401) {
          expireSession(error.message);
          setRowStates((current) => ({ ...current, [id]: { status: "idle", error: null } }));
        } else {
          toast.error(error instanceof Error ? error.message : "Could not save guest.");
          setRowStates((current) => ({
            ...current,
            [id]: { status: "error", error: error instanceof Error ? error.message : "Could not save guest." },
          }));
        }
      });
  };

  const handleDelete = (id: string) => {
    const target = guests.find((entry) => entry.id === id);
    if (target === undefined) {
      return;
    }
    setListMessage(null);
    setDeletingId(id);
    deleteGuest(id)
      .then(() => { toast.success("Guest deleted"); return fetchGuests(); })
      .catch((error: unknown) => {
        if (error instanceof AdminApiError && error.status === 401) {
          expireSession(error.message);
        } else {
          setListMessage(error instanceof Error ? error.message : "Could not delete guest.");
          toast.error(error instanceof Error ? error.message : "Could not delete guest.");
        }
      })
      .finally(() => {
        setDeletingId(null);
      });
  };

  const handleToggleAdd = () => {
    setNewError(null);
    setShowAdd((current) => !current);
  };

  const handleNewChange = (field: keyof AdminGuestDraft, value: string) => {
    setNewDraft((current) => ({ ...current, [field]: value }));
    setNewError(null);
  };

  const handleNewCancel = () => {
    setShowAdd(false);
    setNewDraft(emptyDraft);
    setNewError(null);
  };

  const handleNewCreate = () => {
    const validationError = validateAdminDraft({ ...newDraft, rsvpStatus: "", rsvpEmail: "", rsvpNotes: "" });
    if (validationError !== null) {
      setNewError(validationError);
      return;
    }
    setNewSaving(true);
    setNewError(null);
    createGuest({
      displayName: newDraft.displayName.trim(),
      nickname: newDraft.nickname.trim(),
      invitationStatus: newDraft.invitationStatus as "Yes" | "Maybe",
      guestType: newDraft.guestType as "Church" | "Family" | "Friends" | "Work",
      ownerKey: newDraft.ownerKey as "Kevin" | "Cher",
      internalNotes: newDraft.internalNotes,
    })
      .then(() => {
        toast.success("Guest added");
        setShowAdd(false);
        setNewDraft(emptyDraft);
        void fetchGuests();
      })
      .catch((error: unknown) => {
        if (error instanceof AdminApiError && error.status === 401) {
          expireSession(error.message);
        } else {
          setNewError(error instanceof Error ? error.message : "Could not save guest.");
          toast.error(error instanceof Error ? error.message : "Could not add guest.");
        }
      })
      .finally(() => {
        setNewSaving(false);
      });
  };

  const handleRelationship = async (input: AdminRelationshipRequest) => {
    if (membershipBusy || loading || Object.values(rowStates).some((state) => state.status === "saving")) return false;
    setMembershipBusy(true);
    try {
      setRelationships(await saveRelationship(input));
      toast.success(input.relationship === null ? "Relationship cleared" : "Relationship saved");
      return true;
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) expireSession(error.message);
      else toast.error(error instanceof Error ? error.message : "Could not save relationship.");
      return false;
    } finally { setMembershipBusy(false); }
  };

  return (<>
    <AdminGuestsView
      relationships={relationships}
      membershipBusy={membershipBusy || loading}
      onRelationshipChange={handleRelationship}
      onHistory={() => {
        if (membershipBusy || loading || Object.values(rowStates).some((state) => state.status === "saving")) {
          toast.error("Wait for the current guest update to finish.");
          return;
        }
        setManageGroups(true);
      }}
      deletingId={deletingId}
      drafts={drafts}
      guests={guests.map((guest) => ({ ...guest, ...toDraft(guest) }))}
      isLoading={loading}
      message={listMessage}
      newDraft={newDraft}
      newError={newError}
      newSaving={newSaving}
      onDelete={handleDelete}
      onDraftChange={handleDraftChange}
      onNewCancel={handleNewCancel}
      onNewChange={handleNewChange}
      onNewCreate={handleNewCreate}
      onSave={handleSave}
      onReloadRsvp={(id) => {
        if (loading || membershipBusy || rowStates[id]?.status === "saving") return;
        void getGuest(id).then((fresh) => {
        baselines.current[id] = fresh;
        setGuests((current) => current.map((guest) => guest.id === id ? fresh : guest));
        setDrafts((current) => ({ ...current, [id]: { ...(current[id] ?? toDraft(fresh)), rsvpStatus: fresh.rsvpStatus, rsvpEmail: fresh.rsvpEmail, rsvpNotes: fresh.rsvpNotes } }));
        setRowStates((current) => ({ ...current, [id]: { status: "idle", error: null } }));
        }).catch((error: unknown) => {
          if (error instanceof AdminApiError && error.status === 401) expireSession(error.message);
          else toast.error("Could not reload RSVP. Your edits are preserved.");
        });
      }}
      onToggleAdd={handleToggleAdd}
      rowStates={membershipBusy ? Object.fromEntries(guests.map((guest) => [guest.id, { status: "saving" as const, error: null }])) : rowStates}
      showAdd={showAdd}
      total={total}
    />
    <Sheet open={manageGroups} onOpenChange={setManageGroups}><SheetContent side="right" aria-describedby={undefined} className="w-full overflow-y-auto sm:max-w-xl"><SheetHeader><SheetTitle>RSVP history</SheetTitle></SheetHeader><AdminRelationships guests={guests} /></SheetContent></Sheet>
    </>
  );
};

export { AdminPanel };
