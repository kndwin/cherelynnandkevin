// Local-only synthetic fixture: no API calls or real guest data.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { AdminGuestsView } from "../src/module/admin/admin.data-table.tsx";
import type { AdminGuestDraft, AdminGuestView } from "../src/module/admin/admin.ui.tsx";

const guests: AdminGuestView[] = Array.from({ length: 1000 }, (_, index) => ({
  id: `synthetic-${index}`, displayName: `Synthetic Guest ${index}`, nickname: "",
  facebookGroupAdded: index % 2 === 0, invitationStatus: "Yes", guestType: "Friends", ownerKey: "Kevin",
  internalNotes: "", rsvpStatus: "", rsvpEmail: "", rsvpNotes: "", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
}));
const noop = () => {};
function Harness() {
  const [drafts, setDrafts] = useState<Record<string, AdminGuestDraft>>({});
  const [revision, setRevision] = useState(0);
  return <><button id="rerender" onClick={() => setRevision((value) => value + 1)}>Unrelated parent update {revision}</button><AdminGuestsView
    guests={guests} total={guests.length} drafts={drafts} relationships={[]} rowStates={{}}
    membershipBusy={false} deletingId={null} isLoading={false} message={null}
    newDraft={guests[0]!} newError={null} newSaving={false} showAdd={false}
    onRelationshipChange={async () => false} onHistory={noop} onDelete={noop}
    onDraftChange={(id, field, value) => setDrafts((current) => ({ ...current, [id]: { ...(current[id] ?? guests.find((guest) => guest.id === id)!), [field]: value } }))}
    onNewChange={noop} onNewCancel={noop} onNewCreate={noop} onSave={noop} onReloadRsvp={noop} onToggleAdd={noop}
  /></>;
}
createRoot(document.getElementById("root")!).render(<Harness />);
