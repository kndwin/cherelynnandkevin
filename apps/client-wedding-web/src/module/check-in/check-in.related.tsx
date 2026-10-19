import { useEffect, useState } from "react";
import { Exit, Schema } from "effect";
import { RelatedMemberSchema, RelatedMembersResponseSchema, type RelatedMember } from "@cherelynnandkevin/client-api-contract/check-in/http";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { PolaroidCard } from "../wedding/presentation";
import { RsvpAttendanceChoices } from "./check-in.ui.tsx";
import { rsvpCardClass, rsvpFieldClass, rsvpGroupClass, rsvpInputClass, rsvpLabelClass, rsvpNotesClass, rsvpSaveClass, rsvpSecondaryClass } from "./check-in.rsvp-styles.ts";

async function post<S extends Schema.Decoder<unknown>>(path: string, body: unknown, schema: S): Promise<S["Type"]> {
  const response = await fetch(`${import.meta.env.VITE_API_URL ?? "/api"}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(response.status === 409 ? "This RSVP changed. Refresh your browser before editing again. Your changes were not saved." : "Could not load or save related guests. Your access may have changed; refresh your browser and try again.");
  const decoded = Schema.decodeUnknownExit(schema)(await response.json());
  if (Exit.isFailure(decoded)) throw new Error("Unexpected server response.");
  return decoded.value;
}

function MemberCard({ member, credentials, refresh }: { member: RelatedMember; credentials: { firstName: string; lastName: string; sitePassword: string }; refresh: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [attending, setAttending] = useState(member.attending);
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [dietaryRequirements, setDietaryRequirements] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [editRevision, setEditRevision] = useState(member.rsvpRevision);
  const changed = editing && editRevision !== member.rsvpRevision;
  const firstName = member.displayName.split(" ")[0] || member.displayName;
  return <PolaroidCard className={rsvpCardClass}>
    {!editing ? <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><h3 className="break-words font-serif text-xl text-[#37430f]">{member.displayName}</h3><p className="mt-1 font-sans text-[0.76rem] text-[#56651f]/70">Attendance: {member.attending || "Not responded"}</p></div><Button className={rsvpSecondaryClass} variant="outline" onClick={() => { setAttending(member.attending); setEditRevision(member.rsvpRevision); setError(null); setNotes(""); setEmail(""); setDietaryRequirements(""); setEditing(true); }} disabled={stale}>Respond</Button></div> : <form className={rsvpGroupClass} onSubmit={(event) => {
      event.preventDefault(); if (changed || stale || (attending !== "Yes" && attending !== "No")) return;
      setBusy(true); setError(null);
      void post("/rsvps/behalf", { ...credentials, targetId: member.id, attending, expectedRevision: editRevision, ...(notes.trim() ? { notes: notes.trim() } : {}), ...(email.trim() ? { email: email.trim() } : {}), ...(dietaryRequirements.trim() ? { dietaryRequirements: dietaryRequirements.trim() } : {}) }, RelatedMemberSchema)
        .then(async () => { setEditing(false); setNotes(""); setEmail(""); setDietaryRequirements(""); await refresh(); })
        .catch((cause: unknown) => { const message = cause instanceof Error ? cause.message : "Could not save RSVP."; setError(message); setStale(message.includes("changed")); })
        .finally(() => setBusy(false));
    }}>
      <h3 className="break-words font-serif text-xl text-[#37430f]">Responding for {member.displayName}</h3>
      <RsvpAttendanceChoices attending={attending} disabled={busy || stale || changed} onChange={setAttending} />
      <label className={rsvpFieldClass}><span className={rsvpLabelClass}>Email (optional)</span><Input className={rsvpInputClass} type="email" autoComplete="off" maxLength={254} value={email} disabled={busy} placeholder={member.hasEmail ? "Email already saved" : `${firstName}'s email`} onChange={(event) => setEmail(event.currentTarget.value)} /></label>
      <p className="-mt-2 font-sans text-[0.76rem] leading-relaxed text-[#56651f]/70">{member.hasEmail ? `Leave blank to send ${firstName}'s confirmation to the email we already have.` : `Add an email so ${firstName} gets a confirmation.`}</p>
      <label className={rsvpFieldClass}><span className={rsvpLabelClass}>Dietary requirements (optional)</span><textarea className={rsvpNotesClass} rows={3} maxLength={1000} value={dietaryRequirements} disabled={busy} placeholder="Any allergies or dietary requirements?" onChange={(event) => setDietaryRequirements(event.target.value)} /></label>
      <label className={rsvpFieldClass}><span className={rsvpLabelClass}>New notes (optional)</span><textarea className={rsvpNotesClass} rows={3} maxLength={1000} value={notes} disabled={busy} onChange={(event) => setNotes(event.target.value)} /></label>
      <p className="font-sans text-[0.76rem] leading-relaxed text-[#56651f]/70">Leave any field blank to keep what is already saved. Saved details are private and are not shown here.</p>
      {changed && <p className="text-[0.75rem] text-[#9f342d]" role="alert">This RSVP changed while you were editing. Your draft is preserved. Refresh your browser before editing again.</p>}
      <Button className={rsvpSaveClass} disabled={busy || stale || changed || !attending} type="submit">{busy ? "Saving RSVP" : "Save RSVP"}</Button>
      <Button className={rsvpSecondaryClass} type="button" variant="outline" disabled={busy} onClick={() => setEditing(false)}>Cancel</Button>
    </form>}
    {error && <p className="text-[0.75rem] text-[#9f342d]" role="alert">{error}</p>}
  </PolaroidCard>;
}

export function RelatedGuests({ firstName, lastName, sitePassword, revision }: { firstName: string; lastName: string; sitePassword: string; revision: number | undefined }) {
  const [members, setMembers] = useState<readonly RelatedMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const credentials = { firstName, lastName, sitePassword };
  const refresh = async () => {
    const result = await post("/rsvps/related", credentials, RelatedMembersResponseSchema);
    setMembers(result.members); setError(null);
  };
  useEffect(() => { let active = true; void post("/rsvps/related", { firstName, lastName, sitePassword }, RelatedMembersResponseSchema).then((result) => { if (active) setMembers(result.members); }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load related guests."); }); return () => { active = false; }; }, [firstName, lastName, sitePassword, revision]);
  if (!members.length && !error) return null;
  return <section aria-labelledby="related-guests-title" className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 sm:pb-16"><div className="mx-auto grid w-full max-w-xl gap-4"><header className="grid gap-2"><h2 id="related-guests-title" className="font-serif text-xl text-[#37430f]">Related guests</h2><p className="font-sans text-[0.76rem] leading-relaxed text-[#56651f]/70">You can respond separately for these guests.</p></header>{error && <p className="text-[0.75rem] text-[#9f342d]" role="alert">{error}</p>}{members.map((member) => <MemberCard key={member.id} member={member} credentials={credentials} refresh={refresh} />)}</div></section>;
}
