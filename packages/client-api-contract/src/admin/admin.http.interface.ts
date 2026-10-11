import {
  AdminCreateGuestRequestSchema,
  AdminDeleteGuestResponseSchema,
  AdminGuestSchema,
  AdminListGuestsQuerySchema,
  AdminListGuestsResponseSchema,
  AdminLoginRequestSchema,
  AdminLoginResponseSchema,
  AdminUpdateGuestRequestSchema,
  DisplayNameSchema,
  GuestTypeSchema,
  InternalNotesSchema,
  InvitationStatusSchema,
  OwnerKeySchema,
  RsvpEmailSchema,
  RsvpNotesSchema,
  RsvpStatusSchema,
} from "./admin.http.schema.ts";

export {
  AdminCreateGuestRequestSchema,
  AdminDeleteGuestResponseSchema,
  AdminGuestSchema,
  AdminListGuestsQuerySchema,
  AdminListGuestsResponseSchema,
  AdminLoginRequestSchema,
  AdminLoginResponseSchema,
  AdminUpdateGuestRequestSchema,
  DisplayNameSchema,
  GuestTypeSchema,
  InternalNotesSchema,
  InvitationStatusSchema,
  OwnerKeySchema,
  RsvpEmailSchema,
  RsvpNotesSchema,
  RsvpStatusSchema,
} from "./admin.http.schema.ts";

export type {
  AdminCreateGuestRequest,
  AdminDeleteGuestResponse,
  AdminGuest,
  AdminListGuestsQuery,
  AdminListGuestsResponse,
  AdminLoginRequest,
  AdminLoginResponse,
  AdminUpdateGuestRequest,
  GuestType,
  InvitationStatus,
  OwnerKey,
  RsvpStatus,
} from "./admin.http.schema.ts";

// Admin endpoints use a raw HttpRouter surface (instead of HttpApi) because
// login/logout must set and clear an HttpOnly session cookie, which HttpApi
// success payloads cannot express. Payloads and responses above are still the
// shared contract: the server decodes them with Schema and the admin client
// encodes/decodes with the same schemas.
export const AdminRoutes = {
  login: "/admin/login",
  logout: "/admin/logout",
  guests: "/admin/guests",
  guestById: (id: string): string => `/admin/guests/${id}`,
} as const;
