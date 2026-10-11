// Pure URL search-param helpers for guest first/last names. No `window`
// access here so the state machine and tests stay environment-free; the
// panel owns reading `window.location.search` and `history.replaceState`.

interface GuestNameParams {
  readonly firstName: string;
  readonly lastName: string;
}

const GuestFirstNameParam = "firstName";
const GuestLastNameParam = "lastName";

const parseGuestNamesFromSearch = (search: string): GuestNameParams => {
  const params = new URLSearchParams(search);
  return {
    firstName: params.get(GuestFirstNameParam) ?? "",
    lastName: params.get(GuestLastNameParam) ?? "",
  };
};

const withGuestNamesInSearch = (search: string, firstName: string, lastName: string): string => {
  const params = new URLSearchParams(search);
  params.set(GuestFirstNameParam, firstName);
  params.set(GuestLastNameParam, lastName);
  const next = params.toString();
  return next.length > 0 ? `?${next}` : "";
};

const withoutGuestNamesFromSearch = (search: string): string => {
  const params = new URLSearchParams(search);
  params.delete(GuestFirstNameParam);
  params.delete(GuestLastNameParam);
  const next = params.toString();
  return next.length > 0 ? `?${next}` : "";
};

export { parseGuestNamesFromSearch, withGuestNamesInSearch, withoutGuestNamesFromSearch };
export type { GuestNameParams };
