import { useState } from "react";
import { reciprocalRelationship, type RelationshipType } from "@cherelynnandkevin/client-api-contract/admin/http";
import type { AdminGuestsViewProps } from "./admin.ui.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";

const types: RelationshipType[] = ["Partner", "Parent", "Child", "Sibling", "Family", "Other"];
function TypePicker({ value, label, disabled, onChange }: { value: RelationshipType | ""; label: string; disabled: boolean; onChange: (type: RelationshipType) => void }) {
  return <Select items={types.map((type) => ({ value: type, label: type }))} value={value || null} disabled={disabled} onValueChange={(type) => { if (type) onChange(type as RelationshipType); }}>
    <SelectTrigger size="sm" aria-label={label} className="h-7 w-24 border-0 bg-muted/60 px-2 text-xs shadow-none"><SelectValue placeholder="Choose…" /></SelectTrigger>
    <SelectContent>{types.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
  </Select>;
}

export function RelationshipEditor({ id, props }: { id: string; props: AdminGuestsViewProps }) {
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState("");
  const [type, setType] = useState<RelationshipType | "">("");
  const [error, setError] = useState<string | null>(null);
  const guest = props.guests.find((entry) => entry.id === id)!;
  const links = props.relationships.filter((link) => link.guestAId === id || link.guestBId === id);
  const linked = links.map((link) => link.guestAId === id ? link.guestBId : link.guestAId);
  const candidates = adding ? props.guests.filter((entry) => entry.id !== id && !linked.includes(entry.id) && `${entry.displayName} ${entry.nickname}`.toLowerCase().includes(search.toLowerCase())) : [];
  const disabled = props.membershipBusy || props.deletingId !== null || Object.values(props.rowStates).some((state) => state.status === "saving");
  const save = async (relatedGuestId: string, relationship: RelationshipType | null, create = false) => {
    setError(null);
    const ok = await props.onRelationshipChange({ guestId: id, relatedGuestId, relationship, create });
    if (!ok) setError(create ? "Not saved. Try again; your draft is preserved." : "Not saved. The saved relationship is still shown; select again to retry.");
    else if (create) { setAdding(false); setSearch(""); setTarget(""); setType(""); }
  };
  return <div className="grid min-w-64 gap-1" onClick={(event) => event.stopPropagation()}>
    {links.map((link) => {
      const otherId = link.guestAId === id ? link.guestBId : link.guestAId;
      const relationship = link.guestAId === id ? link.relationship : reciprocalRelationship(link.relationship);
      const name = props.guests.find((entry) => entry.id === otherId)?.displayName ?? "Guest";
      return <div key={otherId} className="flex items-center gap-1"><span className="max-w-40 truncate" title={name}>{name}</span><TypePicker value={relationship} label={`${guest.displayName} is ${name}'s`} disabled={disabled} onChange={(next) => { void save(otherId, next); }} /><Button variant="ghost" className="h-7 px-1 text-xs normal-case tracking-normal" aria-label={`Clear relationship between ${guest.displayName} and ${name}`} disabled={disabled} onClick={() => { void save(otherId, null); }}>×</Button></div>;
    })}
    {!adding ? <Button variant="ghost" disabled={disabled} className="h-7 w-fit px-1 text-xs normal-case tracking-normal" onClick={() => setAdding(true)}>+ Add relationship</Button> : <div className="grid gap-1">
      <label className="grid gap-1">Is related to<Input autoFocus aria-label={`Search related guest for ${guest.displayName}`} className="h-7 border-0 bg-muted/50 text-xs" placeholder="Search actual name or nickname…" value={search} disabled={disabled} onChange={(event) => { setSearch(event.target.value); setTarget(""); }} /></label>
      <select aria-label={`Related guest for ${guest.displayName}`} className="h-7 max-w-64 rounded-md border-0 bg-muted/50 text-xs" value={target} disabled={disabled} onChange={(event) => setTarget(event.target.value)}><option value="">Select guest ({candidates.length})</option>{candidates.map((entry) => <option key={entry.id} value={entry.id}>{entry.displayName}</option>)}</select>
      <div className="flex items-center gap-1"><label className="grid gap-1">Relationship<TypePicker value={type} label={`Relationship for ${guest.displayName}`} disabled={disabled} onChange={setType} /></label><Button variant="ghost" className="h-7 px-2 text-xs normal-case tracking-normal" disabled={disabled || !target || !type} onClick={() => { if (type) void save(target, type, true); }}>Add</Button><Button variant="ghost" className="h-7 px-2 text-xs normal-case tracking-normal" disabled={disabled} onClick={() => setAdding(false)}>Cancel</Button></div>
      <span className="max-w-64 text-muted-foreground">{guest.displayName} is the selected guest’s {type || "…"}. Saves when added.</span>
    </div>}
    {error && <span role="alert" className="text-destructive">{error}</span>}
  </div>;
}
