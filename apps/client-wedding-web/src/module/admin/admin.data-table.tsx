import { useState } from "react";
import { RelationshipEditor } from "./admin.relationship-editor.tsx";
import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable, type CellContext, type ColumnDef, type ColumnFiltersState, type SortingState } from "@tanstack/react-table";
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

const choices: Partial<Record<keyof AdminGuestDraft, string[]>> = {
  invitationStatus: ["Yes", "Maybe"], guestType: ["Church", "Family", "Friends", "Work"], ownerKey: ["Kevin", "Cher"], rsvpStatus: ["", "Yes", "No"],
};
const fields: [keyof AdminGuestDraft, string][] = [["nickname", "Nickname"], ["displayName", "Actual name"], ["invitationStatus", "Invited"], ["guestType", "Type"], ["ownerKey", "Key"], ["internalNotes", "Internal notes"], ["rsvpStatus", "RSVP"], ["rsvpEmail", "RSVP email"], ["rsvpNotes", "RSVP notes"]];
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

function Editor({ field, draft, label, disabled, onChange }: { field: keyof AdminGuestDraft; draft: AdminGuestDraft; label: string; disabled: boolean; onChange: (field: keyof AdminGuestDraft, value: string) => void }) {
  const options = choices[field];
  if (options) return <Choice badge label={label} value={draft[field]} options={options} disabled={disabled} onChange={(value) => onChange(field, value)} />;
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

// Stable cell component identity preserves incomplete link drafts on rerenders.
function RelationshipCell({ row, table }: CellContext<AdminGuestView, unknown>) {
  return <RelationshipEditor id={row.original.id} props={(table.options.meta as { adminProps: AdminGuestsViewProps }).adminProps} />;
}

export function AdminGuestsView(props: AdminGuestsViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminGuestView | null>(null);
  const selectedGuest = props.guests.find((guest) => guest.id === selectedId);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [search, setSearch] = useState("");
  const columns: ColumnDef<AdminGuestView>[] = fields.map(([field, title]) => ({
    accessorKey: field,
    header: ({ column }) => <button className="flex items-center gap-1 text-xs font-medium" onClick={() => column.toggleSorting()}>{title}<ArrowUpDown className="size-3" aria-hidden />{column.getIsSorted() === "asc" ? " ↑" : column.getIsSorted() === "desc" ? " ↓" : ""}</button>,
    cell: ({ row }) => {
      const guest = row.original;
      const draft = props.drafts[guest.id] ?? guest;
      if (choices[field]) return <div onClick={(event) => event.stopPropagation()}><Choice badge label={`${title} for ${guest.displayName}`} value={draft[field]} options={choices[field]!} disabled={props.rowStates[guest.id]?.status === "saving" || props.deletingId === guest.id} onChange={(value) => props.onDraftChange(guest.id, field, value)} /></div>;
      if (field === "displayName" || field === "nickname") return <button className="text-left font-medium hover:underline focus-visible:underline" onClick={(event) => { event.stopPropagation(); setSelectedId(guest.id); }}>{draft[field] || "—"}</button>;
      return <span className="block max-w-56 truncate text-muted-foreground" title={draft[field]}>{draft[field] || "—"}</span>;
    },
    filterFn: (row, id, values: string[]) => !values.length || values.includes(row.getValue<string>(id)),
  }));
   columns.push({ id: "relationships", header: "Is related to · Relationship", cell: RelationshipCell });
   columns.push({ id: "actions", header: "Actions", cell: ({ row }) => {
    const guest = row.original;
    const draft = props.drafts[guest.id] ?? guest;
    const state = props.rowStates[guest.id];
    const dirty = isAdminDraftDirty(draft, guest);
    const validationError = validateAdminDraft(draft);
    const error = validationError ?? state?.error;
    const busy = state?.status === "saving" || props.deletingId === guest.id || props.membershipBusy;
    return <div className="min-w-44" onClick={(event) => event.stopPropagation()}><div className="flex items-center gap-1">
      <Button className={compactButton} disabled={!dirty || busy || !!validationError} title={validationError ?? "Save changes"} onClick={() => props.onSave(guest.id)}>{state?.status === "saving" ? "Saving…" : "Save"}</Button>
      <Button className={`${compactButton} text-destructive`} variant="ghost" disabled={busy} onClick={() => setDeleteTarget(guest)}>Delete</Button>
    </div>{error ? <p role="status" className="mt-1 text-xs text-destructive">{error}</p> : dirty ? <Badge variant="outline" className="mt-1 text-[10px]">Edited</Badge> : state?.status === "saved" ? <span role="status" className="text-xs text-primary">Saved ✓</span> : null}</div>;
  }});
   const table = useReactTable({ data: props.guests as AdminGuestView[], columns, meta: { adminProps: props }, state: { sorting, columnFilters, globalFilter: search }, onSortingChange: setSorting, onColumnFiltersChange: setColumnFilters, onGlobalFilterChange: setSearch, getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getSortedRowModel: getSortedRowModel(), getRowId: (row) => row.id });
  return <div className="grid gap-3">
    <header className="flex flex-wrap items-center justify-between gap-2"><h1 className="font-serif text-xl">Guests <span className="text-sm text-muted-foreground">{props.total} guests</span></h1><div className="flex gap-2"><Button className={compactButton} variant="ghost" onClick={props.onHistory}>RSVP history</Button><Button className={compactButton} onClick={props.onToggleAdd}><Plus className="size-3" />{props.showAdd ? "Close add guest" : "Add guest"}</Button></div></header>
    <div className="flex flex-wrap items-end gap-2 lg:flex-nowrap">
       <label className="grid flex-1 gap-1 text-xs min-w-40 max-w-sm">Search guests<Input className="h-8 rounded-md text-xs" placeholder="Actual name, nickname, notes, or email…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      {(["invitationStatus", "guestType", "ownerKey", "rsvpStatus"] as const).map((field) => {
        const title = fields.find(([key]) => key === field)![1];
        return <div key={field} className="grid w-28 shrink-0 gap-1 text-xs"><span>{title}</span><MultiFilter title={title} values={(table.getColumn(field)?.getFilterValue() as string[] | undefined) ?? []} options={choices[field]!} onChange={(values) => table.getColumn(field)?.setFilterValue(values.length ? values : undefined)} /></div>;
      })}
       <span role="status" className="shrink-0 pb-1 text-xs text-muted-foreground">{props.isLoading ? "Loading guests…" : `${table.getFilteredRowModel().rows.length} matching guests`}</span>
    {search || columnFilters.length ? <div aria-label="Active filters" className="flex min-w-0 flex-wrap items-center gap-2 pb-0.5">
      {columnFilters.flatMap((filter) => (filter.value as string[]).map((value) => <Badge key={`${filter.id}:${value}`} variant="secondary" className={`gap-1 border-0 text-xs font-normal ${badgeColors[value]}`}>
        {fields.find(([key]) => key === filter.id)?.[1]}: {value || "No reply"}
        <button type="button" aria-label={`Remove ${fields.find(([key]) => key === filter.id)?.[1]} filter: ${value || "No reply"}`} className="rounded-sm p-0.5 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-ring" onClick={() => { const remaining = (filter.value as string[]).filter((entry) => entry !== value); table.getColumn(filter.id)?.setFilterValue(remaining.length ? remaining : undefined); }}><X className="size-3" aria-hidden /></button>
      </Badge>))}
      {search ? <Badge variant="secondary" className="gap-1 border-0 bg-muted text-xs font-normal">Search: {search}<button type="button" aria-label="Remove search filter" className="rounded-sm p-0.5 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-ring" onClick={() => setSearch("")}><X className="size-3" aria-hidden /></button></Badge> : null}
      <Button className={compactButton} variant="ghost" onClick={() => { setSearch(""); setColumnFilters([]); }}><X className="size-3" />Clear filters</Button>
    </div> : null}
    </div>
    {props.message ? <p role="status" className="text-sm text-destructive">{props.message}</p> : null}
    {props.showAdd ? <section className="rounded-lg border bg-card p-3"><h2 className="mb-2 text-sm font-semibold">Add guest</h2><div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{fields.slice(0, 6).map(([field, title]) => <label key={field} className="grid gap-1 text-xs">{title}<Editor field={field} draft={props.newDraft} label={`New guest ${title}`} disabled={props.newSaving} onChange={props.onNewChange} /></label>)}</div><div className="mt-2 flex items-center gap-2"><Button className={compactButton} disabled={props.newSaving || !!validateAdminDraft(props.newDraft)} onClick={props.onNewCreate}>{props.newSaving ? "Adding…" : "Create guest"}</Button><Button className={compactButton} variant="outline" onClick={props.onNewCancel} disabled={props.newSaving}>Cancel</Button><p role="status" className="text-xs text-destructive">{props.newError}</p></div></section> : null}
    <div className="rounded-lg bg-card"><Table className="text-xs"><TableHeader>{table.getHeaderGroups().map((group) => <TableRow key={group.id} className="border-0 bg-muted/60">{group.headers.map((header) => <TableHead key={header.id} className="h-8 px-2">{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>)}</TableHeader><TableBody>{table.getRowModel().rows.map((row) => <TableRow key={row.id} className="cursor-pointer border-0" data-state={selectedId === row.id ? "selected" : undefined} onClick={() => setSelectedId(row.id)}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id} className="px-2 py-1.5 align-middle">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>)}{!table.getRowModel().rows.length ? <TableRow><TableCell colSpan={columns.length} className="h-20 text-center">{props.isLoading ? "Loading guests…" : "No guests match these filters."}</TableCell></TableRow> : null}</TableBody></Table></div>
    <Sheet open={!!selectedGuest} onOpenChange={(open) => { if (!open) setSelectedId(null); }}><SheetContent side="right" aria-describedby={undefined} className="w-full overflow-y-auto sm:max-w-md">
      {selectedGuest ? <><SheetHeader><SheetTitle>{selectedGuest.nickname || selectedGuest.displayName}</SheetTitle></SheetHeader>
      <div className="grid gap-3 px-4 pb-4">{fields.map(([field, title]) => <label key={field} className="grid gap-1 text-xs">{title}<Editor field={field} draft={props.drafts[selectedGuest.id] ?? selectedGuest} label={`${title} for ${selectedGuest.displayName}`} disabled={props.rowStates[selectedGuest.id]?.status === "saving" || props.deletingId === selectedGuest.id} onChange={(key, value) => props.onDraftChange(selectedGuest.id, key, value)} /></label>)}
      <div role="status" className="text-xs text-destructive">{validateAdminDraft(props.drafts[selectedGuest.id] ?? selectedGuest) ?? props.rowStates[selectedGuest.id]?.error}</div>
      <Button variant="ghost" className={compactButton} disabled={props.membershipBusy || props.rowStates[selectedGuest.id]?.status === "saving"} onClick={() => props.onReloadRsvp(selectedGuest.id)}>Reload RSVP (discard RSVP edits only)</Button>
      <div className="flex gap-2"><Button className={compactButton} disabled={props.rowStates[selectedGuest.id]?.status === "saving" || !isAdminDraftDirty(props.drafts[selectedGuest.id] ?? selectedGuest, selectedGuest) || !!validateAdminDraft(props.drafts[selectedGuest.id] ?? selectedGuest)} onClick={() => props.onSave(selectedGuest.id)}>{props.rowStates[selectedGuest.id]?.status === "saving" ? "Saving…" : "Save changes"}</Button><Button className={`${compactButton} text-destructive`} variant="ghost" disabled={props.rowStates[selectedGuest.id]?.status === "saving" || props.deletingId === selectedGuest.id} onClick={() => setDeleteTarget(selectedGuest)}>Delete</Button></div>
       {props.rowStates[selectedGuest.id]?.status === "saved" ? <p role="status" className="text-xs text-primary">Saved ✓</p> : null}
       <dl className="grid gap-2 text-xs text-muted-foreground">{([["Created", selectedGuest.createdAt], ["Last updated", selectedGuest.updatedAt]] as const).map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-1"><dt>{label}</dt><dd><time dateTime={value}>{timestampFormatter.format(new Date(value))}</time></dd></div>)}</dl>
      </div></> : null}
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
