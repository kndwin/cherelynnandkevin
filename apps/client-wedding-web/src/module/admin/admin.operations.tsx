import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { AdminFailedAttempt, FailedAuthReason, FailedAuthStatus } from "@cherelynnandkevin/client-api-contract/admin/http";
import { AdminApiError, listFailedAttempts, updateFailedAttempt, deleteFailedAttempt, deleteFailedAttempts } from "./admin.api.ts";
import { useAdminSession } from "./admin.layout.tsx";
import { sydneyTime } from "./admin.time.ts";
import { Button } from "@/components/ui/button.tsx";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog.tsx";

function AttemptRow({ attempt, selected, onSelect, onSave, onDelete, busy }: { attempt: AdminFailedAttempt; selected: boolean; onSelect: () => void; onSave: (status: FailedAuthStatus, notes: string) => Promise<void>; onDelete: () => void; busy: boolean }) {
  const [status, setStatus] = useState(attempt.status);
  const [notes, setNotes] = useState(attempt.notes);
  return <tr className="border-b align-top">
    <td className="p-2"><input type="checkbox" aria-label={`Select ${attempt.normalizedName}`} checked={selected} disabled={busy} onChange={onSelect} /></td>
    <td className="p-2">{attempt.normalizedName || "(blank name)"}</td><td className="p-2">{attempt.reason}</td><td className="p-2">{attempt.count}</td>
    <td className="p-2 whitespace-nowrap">{sydneyTime(attempt.firstSeenAt)}</td><td className="p-2 whitespace-nowrap">{sydneyTime(attempt.lastSeenAt)}</td>
    <td className="p-2"><select aria-label={`Status for ${attempt.normalizedName}`} className="rounded border bg-background p-2" disabled={busy} value={status} onChange={(event) => setStatus(event.target.value as FailedAuthStatus)}><option value="new">New</option><option value="resolved">Resolved</option></select></td>
    <td className="p-2"><textarea aria-label={`Notes for ${attempt.normalizedName}`} className="min-w-48 rounded border bg-background p-2" maxLength={2000} disabled={busy} value={notes} onChange={(event) => setNotes(event.target.value)} /></td>
    <td className="grid gap-2 p-2"><Button disabled={busy || (status === attempt.status && notes === attempt.notes)} onClick={() => { void onSave(status, notes); }}>Save</Button><Button variant="outline" disabled={busy} onClick={onDelete}>Delete</Button></td>
  </tr>;
}

export function AdminOperations() {
  const expire = useAdminSession();
  const [status, setStatus] = useState<FailedAuthStatus | "">("new");
  const [reason, setReason] = useState<FailedAuthReason | "">("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [attempts, setAttempts] = useState<readonly AdminFailedAttempt[]>([]);
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [deleting, setDeleting] = useState<readonly string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const report = useCallback((cause: unknown) => {
    if (cause instanceof AdminApiError && cause.status === 401) { expire(cause.message); return; }
    const message = cause instanceof Error ? cause.message : "Could not update failed sign-ins.";
    setError(message); toast.error(message);
  }, [expire]);
  const reload = useCallback(async () => {
    const result = await listFailedAttempts(page, status, reason);
    setAttempts(result.attempts); setTotal(result.total); setSelected([]); setError(null);
    if (result.attempts.length === 0 && page > 1) setPage(page - 1);
  }, [page, status, reason]);
  useEffect(() => {
    let active = true; setLoading(true); setSelected([]); setAttempts([]);
    void listFailedAttempts(page, status, reason).then((result) => { if (active) { setAttempts(result.attempts); setTotal(result.total); setError(null); } }).catch((cause: unknown) => { if (active) report(cause); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, status, reason, report]);
  const save = async (id: string, nextStatus: FailedAuthStatus, notes: string) => {
    setBusy(true); setError(null);
    try { await updateFailedAttempt(id, { status: nextStatus, notes }); toast.success("Attempt saved"); await reload(); }
    catch (cause) { report(cause); } finally { setBusy(false); }
  };
  const confirmDelete = async () => {
    setBusy(true);
    try { const result = deleting.length === 1 ? await deleteFailedAttempt(deleting[0]!) : await deleteFailedAttempts(deleting); setDeleting([]); setSelected([]); toast.success(`${result.deletedCount} attempt records deleted`); await reload(); }
    catch (cause) { report(cause); } finally { setBusy(false); }
  };
  return <section className="grid gap-4">
    <h1 className="font-serif text-2xl">Guest operations</h1><h2>Failed guest sign-ins</h2>
    <p className="text-sm text-muted-foreground">Attempts are aggregated by normalized name and reason. Times shown in Australia/Sydney. No password values are recorded.</p>
    <div className="flex flex-wrap gap-3"><label>Status <select className="rounded border bg-background p-2" disabled={busy} value={status} onChange={(event) => { setStatus(event.target.value as FailedAuthStatus | ""); setPage(1); }}><option value="new">New</option><option value="">All</option><option value="resolved">Resolved</option></select></label>
      <label>Reason <select className="rounded border bg-background p-2" disabled={busy} value={reason} onChange={(event) => { setReason(event.target.value as FailedAuthReason | ""); setPage(1); }}><option value="">All</option><option value="wrong-password">Wrong password</option><option value="name-not-found">Name not found</option><option value="ineligible">Ineligible</option></select></label>
      <Button variant="outline" disabled={busy || loading} onClick={() => { setLoading(true); void reload().catch(report).finally(() => setLoading(false)); }}>Refresh</Button>
      <Button variant="outline" disabled={busy || !selected.length} onClick={() => setDeleting(selected)}>Delete selected ({selected.length})</Button>
    </div>
    {error && <p role="alert">{error}</p>}{loading && <p role="status">Loading attempts…</p>}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2"><input type="checkbox" aria-label="Select all on this page" disabled={busy || !attempts.length} checked={attempts.length > 0 && selected.length === attempts.length} onChange={(event) => setSelected(event.target.checked ? attempts.map((attempt) => attempt.id) : [])} /></th><th>Name</th><th>Reason</th><th>Count</th><th>First seen (Sydney)</th><th>Last seen (Sydney)</th><th>Status</th><th>Notes</th><th>Actions</th></tr></thead><tbody>{attempts.map((attempt) => <AttemptRow key={`${attempt.id}-${attempt.status}-${attempt.notes}`} attempt={attempt} selected={selected.includes(attempt.id)} busy={busy || loading} onSelect={() => setSelected((current) => current.includes(attempt.id) ? current.filter((id) => id !== attempt.id) : [...current, attempt.id])} onSave={(nextStatus, notes) => save(attempt.id, nextStatus, notes)} onDelete={() => setDeleting([attempt.id])} />)}</tbody></table></div>
    {!loading && !attempts.length && !error && <p>No matching failed sign-ins.</p>}
    <div className="flex items-center gap-3"><Button variant="outline" disabled={busy || loading || page === 1} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page} · {total} records</span><Button variant="outline" disabled={busy || loading || page * 50 >= total} onClick={() => setPage(page + 1)}>Next</Button></div>
    <AlertDialog open={deleting.length > 0} onOpenChange={(open) => { if (!open && !busy) setDeleting([]); }}><AlertDialogContent><AlertDialogTitle>Delete failed sign-in records?</AlertDialogTitle><AlertDialogDescription>Permanently delete {deleting.length} selected record(s), including their counts and notes. Guests and RSVPs are unaffected.</AlertDialogDescription><div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setDeleting([])}>Cancel</Button><Button disabled={busy} onClick={() => { void confirmDelete(); }}>Delete records</Button></div></AlertDialogContent></AlertDialog>
  </section>;
}
