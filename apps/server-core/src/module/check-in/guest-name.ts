// Canonical guest-name handling. display_name is the canonical stored value;
// normalized_name (trimmed, lowercased, collapsed whitespace) is the lookup
// key with a uniqueness constraint. This matches the historical Sheets
// behavior on both the server allowlist and the Apps Script matcher.

const normalizeGuestName = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const toGuestFullName = (firstName: string, lastName: string): string =>
  normalizeGuestName(`${firstName} ${lastName}`);

const normalizeDisplayName = (displayName: string): string => normalizeGuestName(displayName);

const isEligibleInvitationStatus = (invitationStatus: string): boolean => invitationStatus === "Yes";

// Escape LIKE/ILIKE wildcards so admin search terms match literally.
// Postgres uses backslash as the default LIKE escape character.
const escapeLikePattern = (value: string): string => value.replace(/[\\%_]/g, (char) => `\\${char}`);

export {
  escapeLikePattern,
  isEligibleInvitationStatus,
  normalizeDisplayName,
  normalizeGuestName,
  toGuestFullName,
};
