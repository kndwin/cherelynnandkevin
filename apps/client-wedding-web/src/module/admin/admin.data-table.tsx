import { useEffect, useMemo, useState } from "react";
import { hasDirtyAdminDrafts } from "./admin.dirty-drafts.ts";
import { compareFacebookGuests, facebookFilterLabel, matchesFacebookFilter } from "./admin.table-values.ts";
import { RelationshipEditor } from "./admin.relationship-editor.tsx";
import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable, type ColumnDef, type ColumnFiltersState, type SortingState } from "@tanstack/react-table";
import { ArrowUpDown, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet.tsx";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from "@/components/ui/alert-dialog.tsx";
import { isAdminDraftDirty, validateAdminDraft, type AdminGuestDraft, type AdminGuestView, type AdminGuestsViewProps } from "./admin.ui.tsx";

type TextField = Exclude<keyof AdminGuestDraft, "facebookGroupAdded">;
const choices: Partial<Record<TextField, string[]>> = {
  invitationStatus: ["Yes", "Maybe"], guestType: ["Church", "Family", "Friends", "Work"], ownerKey: ["Kevin", "Cher"], rsvpStatus: ["", "Yes", "No"],
};
const fields: [keyof AdminGuestDraft, string][] = [["displayName", "Actual name"], ["nickname", "Nickname"], ["invitationStatus", "Invited"], ["guestType", "Type"], ["ownerKey", "Side"], ["internalNotes", "Internal notes"], ["rsvpStatus", "RSVP"], ["rsvpEmail", "RSVP email"], ["rsvpNotes", "RSVP notes"]];
const compactButton = "h-8 rounded-md px-2 text-xs normal-case tracking-normal";
const timestampFormatter = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Sydney", day: "numeric", month: "short", year: "numeric",
  hour: "numeric", minute: "2-digit", timeZoneName: "short",
});
const badgeColors: Record<string, string> = {
  Yes: "bg-[#e3e8d8] text-[#465631]",
  Maybe: "bg-[#eee8d5] text-[#71633d]",
  No: "bg-[#ecdfdb] text-[#79584f]",
  "": "bg-[#eae8e0] text-[#6b6c5c]",
  Church: "bg-[#e5e1e7] text-[#645b6b]",
  Family: "bg-[#ece3d7] text-[#756047]",
  Friends: "bg-[#dfe7e3] text-[#50685f]",
  Work: "bg-[#e1e4e7] text-[#5c6470]",
  Kevin: "bg-[#dee6d3] text-[#52613b]",
  Cher: "bg-[#ecdfdf] text-[#795b62]",
};

function Choice({ value, options, label, onChange, disabled = false, badge = false }: { value: string; options: string[]; label: string; onChange: (value: string) => void; disabled?: boolean; badge?: boolean }) {
  const items = options.map((option) => ({ value: option || "__empty", label: option || "No reply" }));
  return <Select items={items} value={value || "__empty"} onValueChange={(next) => onChange(next === "__empty" ? "" : next ?? "")} disabled={disabled}>
    <SelectTrigger aria-label={label} size="sm" className={badge ? "w-fit border-0 bg-transparent p-0 shadow-none [&>svg]:hidden" : "w-full min-w-24 text-xs"}>{value in badgeColors ? <Badge variant="secondary" className={`border-0 text-xs font-normal ${badgeColors[value]}`}>{value || "No reply"}</Badge> : <SelectValue />}</SelectTrigger>
    <SelectContent>{items.map((item) => {
      const option = item.value === "__empty" ? "" : item.value;
      return <SelectItem key={item.value} value={item.value}>{option in badgeColors ? <Badge variant="secondary" className={`border-0 text-xs font-normal ${badgeColors[option]}`}>{item.label}</Badge> : item.label}</SelectItem>;
    })}</SelectContent>
  </Select>;
}

function Editor({ field, draft, label, disabled, onChange }: { field: keyof AdminGuestDraft; draft: AdminGuestDraft; label: string; disabled: boolean; onChange: (field: keyof AdminGuestDraft, value: string | boolean) => void }) {
  if (field === "facebookGroupAdded") return <input type="checkbox" aria-label={label} checked={draft.facebookGroupAdded} disabled={disabled} onChange={(event) => onChange(field, event.target.checked)} />;
  const options = choices[field];
  if (options) return <Choice label={label} value={draft[field]} options={options} disabled={disabled} onChange={(value) => onChange(field, value)} />;
  if (field === "internalNotes" || field === "rsvpNotes") return <Textarea aria-label={label} value={draft[field]} disabled={disabled} rows={4} maxLength={field === "internalNotes" ? 2000 : 1000} className="min-h-24 w-full min-w-36 resize-y rounded-md px-2 py-2 text-xs" onChange={(event) => onChange(field, event.target.value)} />;
  return <Input aria-label={label} aria-invalid={field === "displayName" && !draft[field].trim()} value={draft[field]} disabled={disabled} type={field === "rsvpEmail" ? "email" : "text"} maxLength={field === "rsvpEmail" ? 254 : 200} className="h-7 min-w-40 rounded-md px-2 text-xs" onChange={(event) => onChange(field, event.target.value)} />;
}

function MultiFilter({ title, options, values, onChange }: { title: string; options: string[]; values: string[]; onChange: (values: string[]) => void }) {
  const items = options.map((value) => ({ value: value || "__empty", label: value || "No reply" }));
  return <Select multiple items={items} value={values.map((value) => value || "__empty")} onValueChange={(next) => onChange(next.map((value) => value === "__empty" ? "" : value))}>
    <SelectTrigger aria-label={`Filter by ${title}`} size="sm" className="w-full text-xs"><span>{values.length ? `${values.length} selected` : "All"}</span></SelectTrigger>
    <SelectContent>{items.map((item) => <SelectItem key={item.value} value={item.value}><Badge variant="secondary" className={`border-0 text-xs font-normal ${badgeColors[item.value === "__empty" ? "" : item.value]}`}>{item.label}</Badge></SelectItem>)}</SelectContent>
  </Select>;
}

type AdminTableMeta = { selectGuest: (id: string) => void; drafts: AdminGuestsViewProps["drafts"] };

export function AdminGuestsView(props: AdminGuestsViewProps) {
  const [selectedId, setOpenId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminGuestView | null>(null);
  const selectedGuest = props.guests.find((guest) => guest.id === selectedId);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [search, setSearch] = useState("");
  const [moreFilters, setMoreFilters] = useState(false);
  const [relationshipDirty, setRelationshipDirty] = useState(false);
  const busy = props.membershipBusy || props.deletingId !== null || Object.values(props.rowStates).some((state) => state.status === "saving");
  const dirty = !!selectedGuest && isAdminDraftDirty(props.drafts[selectedGuest.id] ?? selectedGuest, selectedGuest);
  const anyDirty = hasDirtyAdminDrafts(props.drafts, props.guests);
  const selectGuest = (id: string | null) => {
    if (id === selectedId || busy) return;
    if ((dirty || relationshipDirty) && !window.confirm("Leave this guest? Unsaved guest edits are kept until you return. An unfinished relationship will be discarded.")) return;
    setRelationshipDirty(false);
    setOpenId(id);
  };
  const setSelectedId = selectGuest;
  useEffect(() => {
    if (!anyDirty && !relationshipDirty) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [anyDirty, relationshipDirty]);
  // Only cell identities are memoized; every render reads current drafts/callbacks from meta.
  const columns = useMemo<ColumnDef<AdminGuestView>[]>(() => {
  const columns: ColumnDef<AdminGuestView>[] = ([["displayName", "Guest"], ["invitationStatus", "Invited"], ["rsvpStatus", "RSVP"], ["guestType", "Type"], ["ownerKey", "Side"]] as const).map(([field, title]) => ({
    accessorKey: field,
    header: ({ column }) => <button className="flex items-center gap-1 text-xs font-medium" onClick={() => column.toggleSorting()}>{title}<ArrowUpDown className="size-3" aria-hidden />{column.getIsSorted() === "asc" ? " ↑" : column.getIsSorted() === "desc" ? " ↓" : ""}</button>,
    cell: ({ row, table }) => {
      const { selectGuest, drafts } = table.options.meta as AdminTableMeta;
      const guest = row.original;
      if (field === "displayName") return <button aria-label={`Open guest ${guest.displayName}`} className="grid min-h-11 text-left font-medium hover:underline focus-visible:underline" onClick={(event) => { event.stopPropagation(); selectGuest(guest.id); }}><span>{guest.displayName}</span>{guest.nickname ? <span className="text-xs font-normal text-muted-foreground">{guest.nickname}</span> : null}{drafts[guest.id] && isAdminDraftDirty(drafts[guest.id]!, guest) ? <span className="text-xs font-normal text-muted-foreground">Unsaved changes</span> : null}</button>;
      return <Badge variant="secondary" className={`border-0 font-normal ${badgeColors[guest[field]]}`}>{guest[field] || "No reply"}</Badge>;
    },
    filterFn: (row, id, values: string[]) => !values.length || values.includes(row.getValue<string>(id)),
  }));
   columns.push({ accessorKey: "facebookGroupAdded", header: ({ column }) => <button className="flex items-center gap-1 text-xs font-medium" onClick={() => column.toggleSorting()}>Notified<ArrowUpDown className="size-3" aria-hidden />{column.getIsSorted() === "asc" ? " ↑" : column.getIsSorted() === "desc" ? " ↓" : ""}</button>, sortingFn: (a, b) => compareFacebookGuests(a.original, b.original), filterFn: (row, id, values: boolean[]) => matchesFacebookFilter(row.getValue<boolean>(id), values), cell: ({ row }) => row.original.facebookGroupAdded ? "Yes" : "No" });
   return columns;
   }, []);
   const meta: AdminTableMeta = { selectGuest, drafts: props.drafts };
   const table = useReactTable({ data: props.guests as AdminGuestView[], columns, meta, globalFilterFn: (row, _id, value: string) => [row.original.displayName, row.original.nickname, row.original.internalNotes, row.original.rsvpEmail, row.original.rsvpNotes].some((text) => text.toLowerCase().includes(value.toLowerCase())), state: { sorting, columnFilters, globalFilter: search }, onSortingChange: setSorting, onColumnFiltersChange: setColumnFilters, onGlobalFilterChange: setSearch, getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getSortedRowModel: getSortedRowModel(), getRowId: (row) => row.id });
  return <div className="grid gap-3">
    <header className="flex flex-wrap items-center justify-between gap-2"><h1 className="font-serif text-xl">Guests <span className="text-sm text-muted-foreground">{props.total} guests</span></h1><div className="flex gap-2"><Button className={compactButton} variant="ghost" onClick={props.onHistory}>RSVP history</Button><Button className={compactButton} onClick={props.onToggleAdd}><Plus className="size-3" />{props.showAdd ? "Close add guest" : "Add guest"}</Button></div></header>
    <div className="flex flex-wrap items-end gap-2 lg:flex-nowrap">
       <label className="grid flex-1 gap-1 text-xs min-w-40 max-w-sm">Search guests<Input className="h-8 rounded-md text-xs" placeholder="Actual name, nickname, notes, or email…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <Button variant="outline" className={compactButton} aria-expanded={moreFilters} onClick={() => setMoreFilters(!moreFilters)}>More filters{columnFilters.filter((filter) => ["guestType", "ownerKey", "facebookGroupAdded"].includes(filter.id)).length ? " •" : ""}</Button>
      {(["invitationStatus", "rsvpStatus", ...(moreFilters ? ["guestType", "ownerKey"] as const : [])] as const).map((field) => {
        const title = fields.find(([key]) => key === field)![1];
        return <div key={field} className="grid w-28 shrink-0 gap-1 text-xs"><span>{title}</span><MultiFilter title={title} values={(table.getColumn(field)?.getFilterValue() as string[] | undefined) ?? []} options={choices[field]!} onChange={(values) => table.getColumn(field)?.setFilterValue(values.length ? values : undefined)} /></div>;
       })}
       {moreFilters ? <div className="grid w-36 shrink-0 gap-1 text-xs"><span>Notified</span><Select items={[{ value: "all", label: "All" }, { value: "true", label: "Yes" }, { value: "false", label: "No" }]} value={((table.getColumn("facebookGroupAdded")?.getFilterValue() as boolean[] | undefined)?.[0])?.toString() ?? "all"} onValueChange={(value) => table.getColumn("facebookGroupAdded")?.setFilterValue(value === "true" ? [true] : value === "false" ? [false] : undefined)}><SelectTrigger aria-label="Filter by Notified" size="sm" className="w-full text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent></Select></div> : null}
       <span role="status" className="shrink-0 pb-1 text-xs text-muted-foreground">{props.isLoading ? "Loading guests…" : `${table.getFilteredRowModel().rows.length} matching guests`}</span>
    {search || columnFilters.length ? <div aria-label="Active filters" className="flex min-w-0 flex-wrap items-center gap-2 pb-0.5">
       {columnFilters.flatMap((filter) => (filter.value as (string | boolean)[]).map((value) => <Badge key={`${filter.id}:${value}`} variant="secondary" className={`gap-1 border-0 text-xs font-normal ${typeof value === "string" ? badgeColors[value] : ""}`}>
         {filter.id === "facebookGroupAdded" ? "Notified" : fields.find(([key]) => key === filter.id)?.[1]}: {typeof value === "boolean" ? facebookFilterLabel(value) : value || "No reply"}
         <button type="button" aria-label={`Remove ${filter.id === "facebookGroupAdded" ? "Notified" : fields.find(([key]) => key === filter.id)?.[1]} filter: ${typeof value === "boolean" ? facebookFilterLabel(value) : value || "No reply"}`} className="rounded-sm p-0.5 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-ring" onClick={() => { const remaining = (filter.value as (string | boolean)[]).filter((entry) => entry !== value); table.getColumn(filter.id)?.setFilterValue(remaining.length ? remaining : undefined); }}><X className="size-3" aria-hidden /></button>
      </Badge>))}
      {search ? <Badge variant="secondary" className="gap-1 border-0 bg-muted text-xs font-normal">Search: {search}<button type="button" aria-label="Remove search filter" className="rounded-sm p-0.5 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-ring" onClick={() => setSearch("")}><X className="size-3" aria-hidden /></button></Badge> : null}
      <Button className={compactButton} variant="ghost" onClick={() => { setSearch(""); setColumnFilters([]); }}><X className="size-3" />Clear filters</Button>
    </div> : null}
    </div>
    {props.message ? <p role="status" className="text-sm text-destructive">{props.message}</p> : null}
    {props.showAdd ? <section className="rounded-lg border bg-card p-3"><h2 className="mb-2 text-sm font-semibold">Add guest</h2><div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{fields.slice(0, 6).map(([field, title]) => <label key={field} className="grid gap-1 text-xs">{title}<Editor field={field} draft={props.newDraft} label={`New guest ${title}`} disabled={props.newSaving} onChange={props.onNewChange} /></label>)}</div><div className="mt-2 flex items-center gap-2"><Button className={compactButton} disabled={props.newSaving || !!validateAdminDraft(props.newDraft)} onClick={props.onNewCreate}>{props.newSaving ? "Adding…" : "Create guest"}</Button><Button className={compactButton} variant="outline" onClick={props.onNewCancel} disabled={props.newSaving}>Cancel</Button><p role="status" className="text-xs text-destructive">{props.newError}</p></div></section> : null}
    <div className="rounded-lg bg-card"><Table className="text-xs"><TableHeader>{table.getHeaderGroups().map((group) => <TableRow key={group.id} className="border-0 bg-muted/60">{group.headers.map((header) => <TableHead key={header.id} className="h-8 px-2">{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>)}</TableHeader><TableBody>{table.getRowModel().rows.map((row) => <TableRow key={row.id} className="cursor-pointer border-0" data-state={selectedId === row.id ? "selected" : undefined} onClick={() => setSelectedId(row.id)}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id} className="px-2 py-1.5 align-middle">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>)}{!table.getRowModel().rows.length ? <TableRow><TableCell colSpan={columns.length} className="h-20 text-center">{props.isLoading ? "Loading guests…" : "No guests match these filters."}</TableCell></TableRow> : null}</TableBody></Table></div>
    <Sheet open={!!selectedGuest} onOpenChange={(open) => { if (!open) selectGuest(null); }}><SheetContent side="right" aria-describedby={undefined} className="data-[side=right]:w-full data-[side=right]:sm:w-[560px] data-[side=right]:sm:max-w-[560px] overflow-hidden">
      {selectedGuest ? <><SheetHeader><SheetTitle>{selectedGuest.displayName}</SheetTitle></SheetHeader>
      <div className="grid flex-1 overflow-y-auto gap-5 px-4 pb-4">{([{ title: "Guest details", fields: [...fields.slice(0, 5), ["facebookGroupAdded", "Notified"] as [keyof AdminGuestDraft, string]] }, { title: "RSVP response", fields: fields.slice(6) }, { title: "Internal notes", fields: fields.slice(5, 6) }]).map((section) => <section key={section.title} className="grid gap-3 border-t pt-4"><h2 className="text-sm font-semibold">{section.title}</h2>{section.fields.map(([field, title]) => <label key={field} className="grid gap-1 text-xs">{title}<Editor field={field} draft={props.drafts[selectedGuest.id] ?? selectedGuest} label={`${title} for ${selectedGuest.displayName}`} disabled={busy} onChange={(key, value) => props.onDraftChange(selectedGuest.id, key, value)} /></label>)}{section.title === "Guest details" ? <p className="text-xs text-muted-foreground">Notified is a manual flag, not an email delivery status.</p> : section.title === "RSVP response" ? <Button variant="ghost" className={compactButton} disabled={busy} onClick={() => props.onReloadRsvp(selectedGuest.id)}>Reload RSVP (discard RSVP edits only)</Button> : null}</section>)}
      <section className="grid gap-3 border-t pt-4"><h2 className="text-sm font-semibold">Relationships</h2><p className="text-xs text-muted-foreground">Relationship changes save immediately, separately from guest details.</p><RelationshipEditor key={selectedGuest.id} id={selectedGuest.id} props={props} onDirtyChange={setRelationshipDirty} /></section>
      <div role="status" className="text-xs text-destructive">{validateAdminDraft(props.drafts[selectedGuest.id] ?? selectedGuest) ?? props.rowStates[selectedGuest.id]?.error}</div>
       {props.rowStates[selectedGuest.id]?.status === "saved" ? <p role="status" className="text-xs text-primary">Saved ✓</p> : null}
       <dl className="grid gap-2 text-xs text-muted-foreground">{([["Created", selectedGuest.createdAt], ["Last updated", selectedGuest.updatedAt]] as const).map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-1"><dt>{label}</dt><dd><time dateTime={value}>{timestampFormatter.format(new Date(value))}</time></dd></div>)}</dl>
      </div><footer className="sticky bottom-0 flex flex-wrap gap-2 border-t bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><Button disabled={busy || !dirty || !!validateAdminDraft(props.drafts[selectedGuest.id] ?? selectedGuest)} onClick={() => props.onSave(selectedGuest.id)}>{props.rowStates[selectedGuest.id]?.status === "saving" ? "Saving…" : "Save changes"}</Button><Button variant="outline" disabled={busy} onClick={() => selectGuest(null)}>Close</Button><Button variant="ghost" className="text-destructive" disabled={busy} onClick={() => setDeleteTarget(selectedGuest)}>Delete</Button></footer></> : null}
    </SheetContent></Sheet>
    <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
      <AlertDialogContent>
        <AlertDialogTitle className="text-base font-semibold">Delete {deleteTarget?.nickname || deleteTarget?.displayName}?</AlertDialogTitle>
        <AlertDialogDescription className="text-sm text-muted-foreground">This removes the guest and their RSVP response. This cannot be undone.</AlertDialogDescription>
        <div className="flex justify-end gap-2"><AlertDialogCancel render={<Button variant="outline" />}>Cancel</AlertDialogCancel><Button className="bg-destructive text-white hover:bg-destructive/90" onClick={() => { if (deleteTarget) props.onDelete(deleteTarget.id); setDeleteTarget(null); }}>Delete guest</Button></div>
      </AlertDialogContent>
    </AlertDialog>
    <p className="text-xs text-muted-foreground">Showing {table.getFilteredRowModel().rows.length} of {props.total} guests</p>
  </div>;
}
