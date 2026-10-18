import { Schema } from "effect";

export const RelationshipTypeSchema = Schema.Literals(["Partner", "Parent", "Child", "Sibling", "Family", "Other"]);
export type RelationshipType = typeof RelationshipTypeSchema.Type;
export const reciprocalRelationship = (type: RelationshipType): RelationshipType => type === "Parent" ? "Child" : type === "Child" ? "Parent" : type;
export const AdminRelationshipSchema = Schema.Struct({
  guestAId: Schema.String.check(Schema.isUUID()), guestBId: Schema.String.check(Schema.isUUID()), relationship: RelationshipTypeSchema,
});
export const AdminRelationshipsResponseSchema = Schema.Array(AdminRelationshipSchema);
export const AdminRelationshipRequestSchema = Schema.Struct({
  guestId: Schema.String.check(Schema.isUUID()), relatedGuestId: Schema.String.check(Schema.isUUID()),
  relationship: Schema.NullOr(RelationshipTypeSchema),
  create: Schema.optional(Schema.Boolean),
});
export type AdminRelationship = typeof AdminRelationshipSchema.Type;
export type AdminRelationshipRequest = typeof AdminRelationshipRequestSchema.Type;

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
export const NicknameSchema = Schema.String.check(Schema.isMaxLength(200));

export const InternalNotesSchema = Schema.String.check(Schema.isMaxLength(2000));

export const RsvpEmailSchema = Schema.String.check(Schema.isMaxLength(254));

export const RsvpNotesSchema = Schema.String.check(Schema.isMaxLength(1000));

// Full guest record as returned by admin endpoints. internalNotes is
// admin-only and is never included in public RSVP responses.
export const AdminGuestSchema = Schema.Struct({
  groupId: Schema.optional(Schema.NullOr(Schema.String.check(Schema.isUUID()))),
  rsvpRevision: Schema.optional(Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))),
  id: Schema.String.check(Schema.isUUID()),
  displayName: DisplayNameSchema,
  nickname: Schema.optional(NicknameSchema),
  invitationStatus: InvitationStatusSchema,
  guestType: GuestTypeSchema,
  ownerKey: OwnerKeySchema,
  internalNotes: InternalNotesSchema,
  rsvpStatus: RsvpStatusSchema,
  rsvpEmail: RsvpEmailSchema,
  rsvpNotes: RsvpNotesSchema,
  dietaryRequirements: Schema.optional(RsvpNotesSchema),
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
      Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1), Schema.isLessThanOrEqualTo(1000)),
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
  nickname: Schema.optional(NicknameSchema),
  invitationStatus: InvitationStatusSchema,
  guestType: GuestTypeSchema,
  ownerKey: OwnerKeySchema,
  internalNotes: Schema.optional(InternalNotesSchema),
});
export type AdminCreateGuestRequest = typeof AdminCreateGuestRequestSchema.Type;

export const AdminUpdateGuestRequestSchema = Schema.Struct({
  expectedRevision: Schema.optional(Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))),
  displayName: Schema.optional(DisplayNameSchema),
  nickname: Schema.optional(NicknameSchema),
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

export const AdminGroupRequestSchema = Schema.Struct({ name: DisplayNameSchema });
export const AdminGroupSchema = Schema.Struct({ id: Schema.String.check(Schema.isUUID()), name: DisplayNameSchema });
export const AdminGroupsResponseSchema = Schema.Array(AdminGroupSchema);
export const AdminMembershipRequestSchema = Schema.Struct({ groupId: Schema.NullOr(Schema.String.check(Schema.isUUID())) });
export const AdminRsvpAuditSchema = Schema.Struct({
  id: Schema.String.check(Schema.isUUID()),
  targetGuestId: Schema.String.check(Schema.isUUID()),
  actorGuestId: Schema.NullOr(Schema.String.check(Schema.isUUID())),
  actorKind: Schema.Literals(["admin", "guest"]),
  revision: Schema.Int,
  attendance: RsvpStatusSchema,
  createdAt: Schema.String,
});
export const AdminRsvpAuditResponseSchema = Schema.Array(AdminRsvpAuditSchema);
export type AdminGroup = typeof AdminGroupSchema.Type;
export type AdminRsvpAudit = typeof AdminRsvpAuditSchema.Type;
export type AdminGroupRequest = typeof AdminGroupRequestSchema.Type;
export type AdminGroupsResponse = typeof AdminGroupsResponseSchema.Type;
export type AdminMembershipRequest = typeof AdminMembershipRequestSchema.Type;
export type AdminRsvpAuditResponse = typeof AdminRsvpAuditResponseSchema.Type;

export const FailedAuthReasonSchema = Schema.Literals(["wrong-password", "name-not-found", "ineligible"]);
export const FailedAuthStatusSchema = Schema.Literals(["new", "resolved"]);
export const AdminFailedAttemptSchema = Schema.Struct({
  id: Schema.String.check(Schema.isUUID()),
  normalizedName: Schema.String.check(Schema.isMaxLength(400)),
  reason: FailedAuthReasonSchema,
  count: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  firstSeenAt: Schema.String,
  lastSeenAt: Schema.String,
  status: FailedAuthStatusSchema,
  notes: Schema.String.check(Schema.isMaxLength(2000)),
});
export const AdminListFailedAttemptsQuerySchema = Schema.Struct({
  page: Schema.optional(Schema.NumberFromString.pipe(Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1), Schema.isLessThanOrEqualTo(1000000)))),
  pageSize: Schema.optional(Schema.NumberFromString.pipe(Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1), Schema.isLessThanOrEqualTo(100)))),
  status: Schema.optional(FailedAuthStatusSchema),
  reason: Schema.optional(FailedAuthReasonSchema),
});
export const AdminListFailedAttemptsResponseSchema = Schema.Struct({
  attempts: Schema.Array(AdminFailedAttemptSchema),
  total: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  page: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  pageSize: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1), Schema.isLessThanOrEqualTo(100)),
});
export const AdminUpdateFailedAttemptRequestSchema = Schema.Struct({
  status: Schema.optional(FailedAuthStatusSchema),
  notes: Schema.optional(Schema.String.check(Schema.isMaxLength(2000))),
});
export const AdminDeleteFailedAttemptsRequestSchema = Schema.Struct({
  ids: Schema.Array(Schema.String.check(Schema.isUUID())).check(Schema.isMinLength(1), Schema.isMaxLength(500)),
});
export const AdminDeleteFailedAttemptsResponseSchema = Schema.Struct({ deletedCount: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)) });
export type FailedAuthReason = typeof FailedAuthReasonSchema.Type;
export type FailedAuthStatus = typeof FailedAuthStatusSchema.Type;
export type AdminFailedAttempt = typeof AdminFailedAttemptSchema.Type;
export type AdminListFailedAttemptsQuery = typeof AdminListFailedAttemptsQuerySchema.Type;
export type AdminListFailedAttemptsResponse = typeof AdminListFailedAttemptsResponseSchema.Type;
export type AdminUpdateFailedAttemptRequest = typeof AdminUpdateFailedAttemptRequestSchema.Type;
export type AdminDeleteFailedAttemptsRequest = typeof AdminDeleteFailedAttemptsRequestSchema.Type;
export type AdminDeleteFailedAttemptsResponse = typeof AdminDeleteFailedAttemptsResponseSchema.Type;

export const AdminSyncRunSchema = Schema.Struct({
  id: Schema.String.check(Schema.isUUID()),
  trigger: Schema.Literals(["manual", "scheduled"]),
  status: Schema.Literals(["queued", "running", "succeeded", "failed"]),
  queuedAt: Schema.String,
  startedAt: Schema.NullOr(Schema.String),
  finishedAt: Schema.NullOr(Schema.String),
  guestCount: Schema.NullOr(Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))),
  error: Schema.NullOr(Schema.String),
});
export const AdminSyncStatusSchema = Schema.Struct({
  configured: Schema.Boolean,
  configurationStatus: Schema.Literals(["configured", "not-configured"]),
  activeRun: Schema.NullOr(AdminSyncRunSchema),
  latestRun: Schema.NullOr(AdminSyncRunSchema),
  nextScheduledAt: Schema.String,
  history: Schema.Array(AdminSyncRunSchema),
});
export type AdminSyncRun = typeof AdminSyncRunSchema.Type;
export type AdminSyncStatus = typeof AdminSyncStatusSchema.Type;
