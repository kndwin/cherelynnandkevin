import { useEffect, useState } from "react";
import type { AdminGuest, AdminRsvpAudit } from "@cherelynnandkevin/client-api-contract/admin/http";
import { AdminApiError, listRsvpAudit } from "./admin.api.ts";
import { useAdminSession } from "./admin.layout.tsx";
import { Button } from "@/components/ui/button.tsx";
import { sydneyTime } from "./admin.time.ts";

export function AdminRelationships({ guests }: { guests: readonly AdminGuest[] }) {
  const expire = useAdminSession();
  const [audit, setAudit] = useState<readonly AdminRsvpAudit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    setBusy(true); setError(null);
    try { setAudit(await listRsvpAudit()); }
    catch (cause) { if (cause instanceof AdminApiError && cause.status === 401) expire(cause.message); else setError(cause instanceof Error ? cause.message : "Could not load history."); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, []);
  const guestName = (id: string) => guests.find((guest) => guest.id === id)?.displayName ?? "Deleted guest";
  return <section className="grid gap-3 p-4 text-xs">
    <div className="flex items-center justify-between"><span>Latest 500 RSVP changes · Sydney time</span><Button variant="ghost" className="h-8 px-2 text-xs normal-case tracking-normal" disabled={busy} onClick={() => { void load(); }}>{busy ? "Loading…" : "Refresh"}</Button></div>
    {error && <p role="alert">{error}</p>}
    <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th>Guest</th><th>Actor</th><th>Attendance</th><th>Revision</th><th>Time</th></tr></thead><tbody>{audit.map((entry) => <tr key={entry.id}><td>{guestName(entry.targetGuestId)}</td><td>{entry.actorKind === "admin" ? "Admin" : entry.actorGuestId ? guestName(entry.actorGuestId) : "Guest"}</td><td>{entry.attendance || "Not responded"}</td><td>{entry.revision}</td><td>{sydneyTime(entry.createdAt)}</td></tr>)}</tbody></table></div>
  </section>;
}
