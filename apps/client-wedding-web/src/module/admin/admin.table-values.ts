export const facebookFilterLabel = (value: boolean) => value ? "Added" : "Not added";
export const matchesFacebookFilter = (value: boolean, selected: boolean[]) => !selected.length || selected.includes(value);

export function compareFacebookGuests(a: { facebookGroupAdded: boolean; displayName: string; id: string }, b: { facebookGroupAdded: boolean; displayName: string; id: string }) {
  return Number(a.facebookGroupAdded) - Number(b.facebookGroupAdded) || a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id);
}
