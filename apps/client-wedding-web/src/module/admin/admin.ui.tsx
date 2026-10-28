import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import type { ComponentProps } from "react";
import type { AdminRelationship, AdminRelationshipRequest } from "@cherelynnandkevin/client-api-contract/admin/http";

export interface AdminGuestDraft {
  readonly facebookGroupAdded: boolean;
  readonly displayName: string;
  readonly nickname: string;
  readonly invitationStatus: string;
  readonly guestType: string;
  readonly ownerKey: string;
  readonly internalNotes: string;
  readonly rsvpStatus: string;
  readonly rsvpEmail: string;
  readonly rsvpNotes: string;
}
export interface AdminGuestView extends AdminGuestDraft {
  readonly groupId?: string | null;
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface AdminRowState {
  readonly status: "idle" | "saving" | "saved" | "error";
  readonly error: string | null;
}
export interface AdminGuestsViewProps {
  readonly relationships: readonly AdminRelationship[];
  readonly membershipBusy: boolean;
  readonly onRelationshipChange: (input: AdminRelationshipRequest) => Promise<boolean>;
  readonly onHistory: () => void;
  readonly deletingId: string | null;
  readonly drafts: Readonly<Record<string, AdminGuestDraft>>;
  readonly guests: ReadonlyArray<AdminGuestView>;
  readonly isLoading: boolean;
  readonly message: string | null;
  readonly newDraft: AdminGuestDraft;
  readonly newError: string | null;
  readonly newSaving: boolean;
  readonly onDelete: (id: string) => void;
  readonly onDraftChange: (id: string, field: keyof AdminGuestDraft, value: string | boolean) => void;
  readonly onNewChange: (field: keyof AdminGuestDraft, value: string | boolean) => void;
  readonly onNewCancel: () => void;
  readonly onNewCreate: () => void;
  readonly onSave: (id: string) => void;
  readonly onReloadRsvp: (id: string) => void;
  readonly onToggleAdd: () => void;
  readonly rowStates: Readonly<Record<string, AdminRowState>>;
  readonly showAdd: boolean;
  readonly total: number;
}

export const validateAdminDraft = (draft: AdminGuestDraft): string | null => {
  if (!draft.displayName.trim()) return "Name is required.";
  if (draft.nickname.length > 200) return "Nickname must be 200 characters or fewer.";
  if (draft.displayName.trim().length > 200) return "Name must be 200 characters or fewer.";
  if (!["Yes", "Maybe"].includes(draft.invitationStatus)) return "Invitation status must be Yes or Maybe.";
  if (!["Church", "Family", "Friends", "Work"].includes(draft.guestType)) return "Type must be Church, Family, Friends, or Work.";
  if (!["Kevin", "Cher"].includes(draft.ownerKey)) return "Side must be Kevin or Cher.";
  if (draft.internalNotes.length > 2000) return "Internal notes must be 2000 characters or fewer.";
  if (!["", "Yes", "No"].includes(draft.rsvpStatus)) return "RSVP status must be empty, Yes, or No.";
  if (draft.rsvpEmail.trim().length > 254) return "RSVP email must be 254 characters or fewer.";
  if (draft.rsvpEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.rsvpEmail.trim())) return "RSVP email does not look valid.";
  if (draft.rsvpNotes.length > 1000) return "RSVP notes must be 1000 characters or fewer.";
  return null;
};
export { isAdminDraftDirty } from "./admin.dirty-drafts.ts";

interface AdminLoginViewProps {
  readonly isError: boolean;
  readonly isSubmitting: boolean;
  readonly message: string | null;
  readonly onFormSubmit: NonNullable<ComponentProps<"form">["onSubmit"]>;
  readonly onPasswordChange: (value: string) => void;
  readonly password: string;
}
export const AdminLoginView = (props: AdminLoginViewProps) => <main className="grid min-h-screen place-items-center bg-background p-4 text-foreground">
  <form className="grid w-full max-w-sm gap-4 rounded-lg border bg-card p-6" onSubmit={props.onFormSubmit}>
    <header><h1 className="font-serif text-xl">Guest admin</h1><p className="mt-1 text-xs text-muted-foreground">Enter the admin password to continue.</p></header>
    <label className="grid gap-1.5 text-xs">Admin password<Input autoComplete="current-password" required type="password" value={props.password} onChange={(event) => props.onPasswordChange(event.currentTarget.value)} /></label>
    <Button disabled={props.isSubmitting} type="submit">{props.isSubmitting ? "Signing in" : "Sign in"}</Button>
    <p role="status" aria-live="polite" className={`text-xs ${props.isError ? "text-destructive" : "text-muted-foreground"}`}>{props.message}</p>
  </form>
</main>;
export { AdminGuestsView } from "./admin.data-table.tsx";
