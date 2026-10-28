import { describe, expect, it } from "vitest";
import { createTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel } from "@tanstack/react-table";
import { compareFacebookGuests, facebookFilterLabel, matchesFacebookFilter } from "../src/module/admin/admin.table-values.ts";

const guests = [
  { id: "b", displayName: "Alex", facebookGroupAdded: false },
  { id: "c", displayName: "Zoe", facebookGroupAdded: true },
  { id: "a", displayName: "Alex", facebookGroupAdded: false },
];
function model(values: boolean[] = [], desc = false, sorted = false) {
  return createTable({
    data: guests,
    columns: [{ accessorKey: "facebookGroupAdded", filterFn: (row, id, selected: boolean[]) => matchesFacebookFilter(row.getValue<boolean>(id), selected), sortingFn: (a, b) => compareFacebookGuests(a.original, b.original) }],
    state: { columnFilters: values.length ? [{ id: "facebookGroupAdded", value: values }] : [], sorting: sorted ? [{ id: "facebookGroupAdded", desc }] : [] },
    onStateChange: () => {}, renderFallbackValue: null,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getSortedRowModel: getSortedRowModel(),
  }).getRowModel().rows.map((row) => row.original.id);
}

describe("saved Notified table values (existing manual boolean)", () => {
  it("filters false explicitly, true, both and cleared arrays", () => {
    expect(model([false])).toEqual(["b", "a"]);
    expect(model([true])).toEqual(["c"]);
    expect(model([true, false])).toEqual(["b", "c", "a"]);
    expect(model([])).toEqual(["b", "c", "a"]);
    expect(facebookFilterLabel(false)).toBe("No");
    expect(facebookFilterLabel(true)).toBe("Yes");
  });
  it("sorts both directions with deterministic name/id ties without changing the default", () => {
    expect(model([], false, true)).toEqual(["a", "b", "c"]);
    expect(model([], true, true)).toEqual(["c", "b", "a"]);
    expect(model()).toEqual(["b", "c", "a"]);
  });
});
