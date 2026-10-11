import { Schema } from "effect";

// Guest source columns. Invitation status mirrors the supplied Tier column:
// only "Yes" may public-authenticate; "Maybe" is stored and admin-editable.
export const InvitationStatusSchema = Schema.Literals(["Yes", "Maybe"]);
export type InvitationStatus = typeof InvitationStatusSchema.Type;

export const GuestTypeSchema = Schema.Literals(["Church", "Family", "Friends", "Work"]);
export type GuestType = typeof GuestTypeSchema.Type;

export const OwnerKeySchema = Schema.Literals(["Kevin", "Cher"]);
export type OwnerKey = typeof OwnerKeySchema.Type;

// Stored RSVP attendance. "" means the guest has not responded yet.
export const RsvpStatusSchema = Schema.Literals(["", "Yes", "No"]);
export type RsvpStatus = typeof RsvpStatusSchema.Type;

export const DisplayNameSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(200),
);

export const InternalNotesSchema = Schema.String.check(Schema.isMaxLength(2000));

export const RsvpEmailSchema = Schema.String.check(Schema.isMaxLength(254));

export const RsvpNotesSchema = Schema.String.check(Schema.isMaxLength(1000));

// Full guest record as returned by admin endpoints. internalNotes is
// admin-only and is never included in public RSVP responses.
export const AdminGuestSchema = Schema.Struct({
  id: Schema.String.check(Schema.isUUID()),
  displayName: DisplayNameSchema,
  invitationStatus: InvitationStatusSchema,
  guestType: GuestTypeSchema,
  ownerKey: OwnerKeySchema,
  internalNotes: InternalNotesSchema,
  rsvpStatus: RsvpStatusSchema,
  rsvpEmail: RsvpEmailSchema,
  rsvpNotes: RsvpNotesSchema,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});
export type AdminGuest = typeof AdminGuestSchema.Type;

export const AdminListGuestsQuerySchema = Schema.Struct({
  page: Schema.optional(
    Schema.NumberFromString.pipe(Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1))),
  ),
  pageSize: Schema.optional(
    Schema.NumberFromString.pipe(
      Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1), Schema.isLessThanOrEqualTo(200)),
    ),
  ),
  search: Schema.optional(Schema.String.check(Schema.isMaxLength(200))),
  invitationStatus: Schema.optional(InvitationStatusSchema),
  guestType: Schema.optional(GuestTypeSchema),
  ownerKey: Schema.optional(OwnerKeySchema),
});
export type AdminListGuestsQuery = typeof AdminListGuestsQuerySchema.Type;

export const AdminListGuestsResponseSchema = Schema.Struct({
  guests: Schema.Array(AdminGuestSchema),
  total: Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0))),
  page: Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(1))),
  pageSize: Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(1))),
});
export type AdminListGuestsResponse = typeof AdminListGuestsResponseSchema.Type;

export const AdminCreateGuestRequestSchema = Schema.Struct({
  displayName: DisplayNameSchema,
  invitationStatus: InvitationStatusSchema,
  guestType: GuestTypeSchema,
  ownerKey: OwnerKeySchema,
  internalNotes: Schema.optional(InternalNotesSchema),
});
export type AdminCreateGuestRequest = typeof AdminCreateGuestRequestSchema.Type;

export const AdminUpdateGuestRequestSchema = Schema.Struct({
  displayName: Schema.optional(DisplayNameSchema),
  invitationStatus: Schema.optional(InvitationStatusSchema),
  guestType: Schema.optional(GuestTypeSchema),
  ownerKey: Schema.optional(OwnerKeySchema),
  internalNotes: Schema.optional(InternalNotesSchema),
  rsvpStatus: Schema.optional(RsvpStatusSchema),
  rsvpEmail: Schema.optional(RsvpEmailSchema),
  rsvpNotes: Schema.optional(RsvpNotesSchema),
});
export type AdminUpdateGuestRequest = typeof AdminUpdateGuestRequestSchema.Type;

export const AdminLoginRequestSchema = Schema.Struct({
  password: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(512)),
});
export type AdminLoginRequest = typeof AdminLoginRequestSchema.Type;

export const AdminLoginResponseSchema = Schema.Struct({
  ok: Schema.Literal(true),
});
export type AdminLoginResponse = typeof AdminLoginResponseSchema.Type;

export const AdminDeleteGuestResponseSchema = Schema.Struct({
  id: Schema.String.check(Schema.isUUID()),
});
export type AdminDeleteGuestResponse = typeof AdminDeleteGuestResponseSchema.Type;
