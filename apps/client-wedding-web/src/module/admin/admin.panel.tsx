import { useCallback, useEffect, useState } from "react";
import type { ComponentProps } from "react";
import type { AdminGuest } from "@cherelynnandkevin/client-api-contract/admin/http";
import {
  AdminApiError,
  adminLogin,
  adminLogout,
  createGuest,
  deleteGuest,
  listGuests,
  updateGuest,
} from "./admin.api.ts";
import { AdminGuestsView, AdminLoginView, isAdminDraftDirty, validateAdminDraft } from "./admin.ui.tsx";
import type { AdminFilterView, AdminGuestDraft, AdminRowState } from "./admin.ui.tsx";

const PageSize = 50;

const emptyDraft: AdminGuestDraft = {
  displayName: "",
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
  invitationStatus: guest.invitationStatus,
  guestType: guest.guestType,
  ownerKey: guest.ownerKey,
  internalNotes: guest.internalNotes,
  rsvpStatus: guest.rsvpStatus,
  rsvpEmail: guest.rsvpEmail,
  rsvpNotes: guest.rsvpNotes,
});

const AdminPanel = () => {
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authenticating, setAuthenticating] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);

  const [filter, setFilter] = useState<AdminFilterView>({ search: "", invitationStatus: "", guestType: "", ownerKey: "" });
  const [page, setPage] = useState(1);
  const [guests, setGuests] = useState<ReadonlyArray<AdminGuest>>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listMessage, setListMessage] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<Readonly<Record<string, AdminGuestDraft>>>({});
  const [rowStates, setRowStates] = useState<Readonly<Record<string, AdminRowState>>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [newDraft, setNewDraft] = useState<AdminGuestDraft>(emptyDraft);
  const [newSaving, setNewSaving] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);

  const fetchGuests = useCallback(async (nextPage: number, nextFilter: AdminFilterView) => {
    setLoading(true);
    setListMessage(null);
    try {
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
      setPage(result.page);
      // Preserve in-progress edits for rows that are still visible; only
      // initialize drafts for newly seen rows and prune rows that left.
      setDrafts((current) => {
        const next: Record<string, AdminGuestDraft> = {};
        for (const guest of result.guests) {
          next[guest.id] = current[guest.id] ?? toDraft(guest);
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
        setIsAuthed(false);
        setLoginMessage(error.message);
      } else {
        setListMessage(error instanceof Error ? error.message : "Could not load guests.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthed) {
      void fetchGuests(page, filter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  const handleLoginSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = (event) => {
    event.preventDefault();
    setAuthenticating(true);
    setLoginMessage(null);
    adminLogin(password)
      .then(() => {
        setPassword("");
        setIsAuthed(true);
        setPage(1);
      })
      .catch((error: unknown) => {
        setLoginMessage(error instanceof Error ? error.message : "Could not sign in.");
      })
      .finally(() => {
        setAuthenticating(false);
      });
  };

  const handleLogout = () => {
    void adminLogout().finally(() => {
      setIsAuthed(false);
      setPassword("");
      setGuests([]);
      setDrafts({});
      setRowStates({});
      setShowAdd(false);
      setNewDraft(emptyDraft);
      setNewError(null);
    });
  };

  const handleFilterChange = (field: keyof AdminFilterView, value: string) => {
    setFilter((current) => ({ ...current, [field]: value }));
  };

  const handleFilterSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = (event) => {
    event.preventDefault();
    setPage(1);
    void fetchGuests(1, filter);
  };

  const handlePageChange = (nextPage: number) => {
    void fetchGuests(nextPage, filter);
  };

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

  const handleReset = (id: string) => {
    const server = guests.find((entry) => entry.id === id);
    if (server === undefined) {
      return;
    }
    setDrafts((current) => ({ ...current, [id]: toDraft(server) }));
    setRowStates((current) => ({ ...current, [id]: { status: "idle", error: null } }));
  };

  const handleSave = (id: string) => {
    const server = guests.find((entry) => entry.id === id);
    const draft = drafts[id];
    if (server === undefined || draft === undefined) {
      return;
    }
    if (!isAdminDraftDirty(draft, server)) {
      return;
    }
    const validationError = validateAdminDraft(draft);
    if (validationError !== null) {
      setRowStates((current) => ({ ...current, [id]: { status: "error", error: validationError } }));
      return;
    }
    setRowStates((current) => ({ ...current, [id]: { status: "saving", error: null } }));
    updateGuest(id, {
      displayName: draft.displayName.trim(),
      invitationStatus: draft.invitationStatus as "Yes" | "Maybe",
      guestType: draft.guestType as "Church" | "Family" | "Friends" | "Work",
      ownerKey: draft.ownerKey as "Kevin" | "Cher",
      internalNotes: draft.internalNotes,
      rsvpStatus: draft.rsvpStatus as "" | "Yes" | "No",
      rsvpEmail: draft.rsvpEmail,
      rsvpNotes: draft.rsvpNotes,
    })
      .then((updated) => {
        setGuests((current) => current.map((entry) => (entry.id === id ? updated : entry)));
        setDrafts((current) => ({ ...current, [id]: toDraft(updated) }));
        setRowStates((current) => ({ ...current, [id]: { status: "saved", error: null } }));
      })
      .catch((error: unknown) => {
        if (error instanceof AdminApiError && error.status === 401) {
          setIsAuthed(false);
          setLoginMessage(error.message);
          setRowStates((current) => ({ ...current, [id]: { status: "idle", error: null } }));
        } else {
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
    if (!window.confirm(`Delete ${target.displayName}? This cannot be undone.`)) {
      return;
    }
    setListMessage(null);
    setDeletingId(id);
    deleteGuest(id)
      .then(() => fetchGuests(page, filter))
      .catch((error: unknown) => {
        if (error instanceof AdminApiError && error.status === 401) {
          setIsAuthed(false);
          setLoginMessage(error.message);
        } else {
          setListMessage(error instanceof Error ? error.message : "Could not delete guest.");
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
      invitationStatus: newDraft.invitationStatus as "Yes" | "Maybe",
      guestType: newDraft.guestType as "Church" | "Family" | "Friends" | "Work",
      ownerKey: newDraft.ownerKey as "Kevin" | "Cher",
      internalNotes: newDraft.internalNotes,
    })
      .then(() => {
        setShowAdd(false);
        setNewDraft(emptyDraft);
        setPage(1);
        void fetchGuests(1, filter);
      })
      .catch((error: unknown) => {
        if (error instanceof AdminApiError && error.status === 401) {
          setIsAuthed(false);
          setLoginMessage(error.message);
        } else {
          setNewError(error instanceof Error ? error.message : "Could not save guest.");
        }
      })
      .finally(() => {
        setNewSaving(false);
      });
  };

  if (!isAuthed) {
    return (
      <AdminLoginView
        isError={loginMessage !== null}
        isSubmitting={authenticating}
        message={loginMessage}
        onFormSubmit={handleLoginSubmit}
        onPasswordChange={setPassword}
        password={password}
      />
    );
  }

  return (
    <AdminGuestsView
      deletingId={deletingId}
      drafts={drafts}
      filter={filter}
      guests={guests}
      isLoading={loading}
      message={listMessage}
      newDraft={newDraft}
      newError={newError}
      newSaving={newSaving}
      onDelete={handleDelete}
      onDraftChange={handleDraftChange}
      onFilterChange={handleFilterChange}
      onFilterSubmit={handleFilterSubmit}
      onLogout={handleLogout}
      onNewCancel={handleNewCancel}
      onNewChange={handleNewChange}
      onNewCreate={handleNewCreate}
      onPageChange={handlePageChange}
      onReset={handleReset}
      onSave={handleSave}
      onToggleAdd={handleToggleAdd}
      page={page}
      pageSize={PageSize}
      rowStates={rowStates}
      showAdd={showAdd}
      total={total}
    />
  );
};

export { AdminPanel };
