import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { AdminSyncStatus } from "@cherelynnandkevin/client-api-contract/admin/http";
import { AdminApiError, getSyncStatus, triggerSync } from "./admin.api.ts";
import { useAdminSession } from "./admin.layout.tsx";
import { sydneyTime } from "./admin.time.ts";
import { Button } from "@/components/ui/button.tsx";

export function AdminSyncs() {
  const expire = useAdminSession();
  const [status, setStatus] = useState<AdminSyncStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const report = useCallback((cause: unknown) => { if (cause instanceof AdminApiError && cause.status === 401) expire(cause.message); else setError(cause instanceof Error ? cause.message : "Could not load sync status."); }, [expire]);
  const refresh = useCallback(async () => { const next = await getSyncStatus(); setStatus(next); setError(null); }, []);
  useEffect(() => {
    let active = true;
    let inFlight = false;
    const poll = async () => { if (inFlight) return; inFlight = true; try { const next = await getSyncStatus(); if (active) { setStatus(next); setError(null); } } catch (cause) { if (active) report(cause); } finally { inFlight = false; } };
    void poll(); const timer = setInterval(() => { void poll(); }, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [report]);
  const trigger = async () => {
    setBusy(true);
    try { const run = await triggerSync(); setStatus((current) => current ? { ...current, activeRun: run, latestRun: run } : current); toast.success("Sync queued", { description: "The server accepted the run. Completion will appear below." }); await refresh(); }
    catch (cause) { report(cause); toast.error(cause instanceof Error ? cause.message : "Could not queue sync."); }
    finally { setBusy(false); }
  };
  return <section className="grid gap-4">
    <h1 className="font-serif text-2xl">Google Sheets sync</h1>
    <p className="text-sm text-muted-foreground">Server status refreshes every 15 seconds. All times are Australia/Sydney.</p>
    {error && <p role="alert">{error}</p>}
    {!status ? <p role="status">Loading sync status…</p> : <>
      <p>Configuration: {status.configurationStatus === "configured" ? "Configured" : "Not configured"}</p>
      <p>Next scheduled run (Sydney): {sydneyTime(status.nextScheduledAt)}</p>
      <p role="status">{status.activeRun ? `Active ${status.activeRun.trigger} run: ${status.activeRun.status}` : "No active run"}</p>
      <p>Latest run: {status.latestRun ? `${status.latestRun.trigger} · ${status.latestRun.status} · ${sydneyTime(status.latestRun.finishedAt ?? status.latestRun.queuedAt)}` : "No runs yet"}</p>
      <div className="flex gap-2"><Button disabled={busy || !status.configured || status.activeRun !== null || error !== null} onClick={() => { void trigger(); }}>{busy ? "Queuing…" : "Run manual sync"}</Button><Button variant="outline" disabled={busy} onClick={() => { void refresh().catch(report); }}>Refresh status</Button></div>
      <h2 className="text-xl">Run history (latest 50)</h2>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Trigger</th><th>Outcome</th><th>Queued (Sydney)</th><th>Started (Sydney)</th><th>Finished (Sydney)</th><th>Guests</th><th>Error</th></tr></thead><tbody>{status.history.map((run) => <tr key={run.id} className="border-b"><td className="p-2">{run.trigger === "manual" ? "Manual" : "Scheduled"}</td><td className="p-2">{run.status}</td><td className="p-2">{sydneyTime(run.queuedAt)}</td><td className="p-2">{sydneyTime(run.startedAt)}</td><td className="p-2">{sydneyTime(run.finishedAt)}</td><td className="p-2">{run.guestCount ?? "—"}</td><td className="p-2">{run.error ?? "—"}</td></tr>)}</tbody></table></div>
      {!status.history.length && <p>No sync runs yet.</p>}
    </>}
  </section>;
}
