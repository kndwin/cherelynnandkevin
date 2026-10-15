import type { RsvpRespondRequest } from "@cherelynnandkevin/client-api-contract/check-in/http";
import { and, count, desc, eq, ilike, or, sql, ne } from "drizzle-orm";
import type { BehalfRsvpRequest } from "@cherelynnandkevin/client-api-contract/check-in/http";
import { GuestGroupTable, GuestRelationshipTable, RsvpAuditTable } from "./relationship.table.ts";
import { reciprocalRelationship, RelationshipTypeSchema, type AdminRelationshipRequest } from "@cherelynnandkevin/client-api-contract/admin/http";
import { RsvpConflictError } from "./relationship.schema.ts";
import { SheetsSyncConfig } from "@/module/sync/sync.config.ts";
import { randomUUID } from "node:crypto";
import { Context, Effect, Layer, Schema } from "effect";
import {
  CheckinGuestNotFoundError,
  GuestValidationError,
} from "@/module/check-in/guest.schema.ts";
import {
  escapeLikePattern,
  isEligibleInvitationStatus,
  normalizeDisplayName,
  toGuestFullName,
} from "@/module/check-in/guest-name.ts";
import { GuestSelectSchema, GuestTable } from "@/module/check-in/guest.table.ts";
import { Database } from "@/platform/database.interface.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 254;
const NOTES_MAX_LENGTH = 1000;
const INTERNAL_NOTES_MAX_LENGTH = 2000;
const DISPLAY_NAME_MAX_LENGTH = 200;

const INVITATION_STATUSES = ["Yes", "Maybe"] as const;
const GUEST_TYPES = ["Church", "Family", "Friends", "Work"] as const;
const OWNER_KEYS = ["Kevin", "Cher"] as const;
const RSVP_STATUSES = ["", "Yes", "No"] as const;

type InvitationStatus = (typeof INVITATION_STATUSES)[number];
type GuestType = (typeof GUEST_TYPES)[number];
type OwnerKey = (typeof OWNER_KEYS)[number];
type RsvpStatus = (typeof RSVP_STATUSES)[number];

const isInvitationStatus = (value: string): value is InvitationStatus =>
  (INVITATION_STATUSES as readonly string[]).includes(value);
const isGuestType = (value: string): value is GuestType =>
  (GUEST_TYPES as readonly string[]).includes(value);
const isOwnerKey = (value: string): value is OwnerKey =>
  (OWNER_KEYS as readonly string[]).includes(value);
const isRsvpStatus = (value: string): value is RsvpStatus =>
  (RSVP_STATUSES as readonly string[]).includes(value);

const isValidEmail = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(trimmed);
};

const toAdminGuest = (row: typeof GuestTable.$inferSelect) => {
  const encoded = Schema.encodeSync(GuestSelectSchema)(row);
  return {
    id: encoded.id,
    displayName: encoded.displayName,
    nickname: encoded.nickname,
    groupId: row.groupId,
    rsvpRevision: row.rsvpRevision,
    invitationStatus: encoded.invitationStatus,
    guestType: encoded.guestType,
    ownerKey: encoded.ownerKey,
    internalNotes: encoded.internalNotes ?? "",
    rsvpStatus: encoded.rsvpStatus ?? "",
    rsvpEmail: encoded.rsvpEmail ?? "",
    rsvpNotes: encoded.rsvpNotes ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};

export class GuestRepository extends Context.Service<GuestRepository>()(
  "cherelynnandkevin/server-core/module/check-in/GuestRepository",
  {
    make: Effect.gen(function* () {
      const { db } = yield* Database;
      const sheetsConfig = yield* SheetsSyncConfig;

      const findByNormalizedName = Effect.fn("GuestRepository.findByNormalizedName")(function* ({
        normalizedName,
      }: {
        readonly normalizedName: string;
      }) {
        const rows = yield* db
          .select()
          .from(GuestTable)
          .where(eq(GuestTable.normalizedName, normalizedName))
          .limit(1);
        const row = rows[0];
        if (row === undefined) {
          return yield* new CheckinGuestNotFoundError({});
        }
        return Schema.encodeSync(GuestSelectSchema)(row);
      });

      // Eligibility mirrors the historical Sheets behavior: the guest must
      // exist and have invitation status (source Tier) exactly "Yes". Maybe
      // guests are stored and admin-editable but cannot public-authenticate.
      const findEligibleByName = Effect.fn("GuestRepository.findEligibleByName")(function* ({
        firstName,
        lastName,
      }: {
        readonly firstName: string;
        readonly lastName: string;
      }) {
        const normalizedName = toGuestFullName(firstName, lastName);
        if (normalizedName.length === 0) {
          return yield* new CheckinGuestNotFoundError({});
        }
        const guest = yield* findByNormalizedName({ normalizedName });
        if (!isEligibleInvitationStatus(guest.invitationStatus)) {
          return yield* new CheckinGuestNotFoundError({});
        }
        return guest;
      });

      return {
        adminRelationships: () => db.select().from(GuestRelationshipTable),
        adminRelationshipSave: (input: AdminRelationshipRequest) => db.transaction((tx) => Effect.gen(function* () {
          if (input.guestId === input.relatedGuestId) return yield* new GuestValidationError({ message: "A guest cannot be related to themselves" });
          if (input.relationship !== null && !Schema.is(RelationshipTypeSchema)(input.relationship)) return yield* new GuestValidationError({ message: "Invalid relationship" });
          const [guestAId, guestBId] = [input.guestId, input.relatedGuestId].sort() as [string, string];
          // Same deterministic guest locks as behalf saves: permission cannot
          // disappear between its authorization check and RSVP update.
          const endpoints = yield* tx.select({ id: GuestTable.id }).from(GuestTable).where(or(eq(GuestTable.id, guestAId), eq(GuestTable.id, guestBId))).orderBy(GuestTable.id).for("update");
          if (endpoints.length !== 2) return yield* new CheckinGuestNotFoundError({});
          const pair = and(eq(GuestRelationshipTable.guestAId, guestAId), eq(GuestRelationshipTable.guestBId, guestBId));
          if (input.relationship === null) {
            yield* tx.delete(GuestRelationshipTable).where(pair);
          } else {
            const relationship = input.guestId === guestAId ? input.relationship : reciprocalRelationship(input.relationship);
            const existing = yield* tx.select().from(GuestRelationshipTable).where(pair);
            if (input.create && existing.length) return yield* new GuestValidationError({ message: "These guests are already related" });
            if (!input.create && !existing.length) return yield* new GuestValidationError({ message: "Relationship no longer exists. Reload before editing." });
            if (existing.length) yield* tx.update(GuestRelationshipTable).set({ relationship }).where(pair);
            else yield* tx.insert(GuestRelationshipTable).values({ guestAId, guestBId, relationship });
          }
          return yield* tx.select().from(GuestRelationshipTable);
        })),
        authFailureReason: ({ firstName, lastName }: { firstName: string; lastName: string }) => Effect.gen(function* () {
          const rows = yield* db.select({ invitationStatus: GuestTable.invitationStatus }).from(GuestTable)
            .where(eq(GuestTable.normalizedName, toGuestFullName(firstName, lastName))).limit(1);
          if (!rows[0]) return "name-not-found" as const;
          return rows[0].invitationStatus === "Yes" ? null : "ineligible" as const;
        }),
        adminGroups: () => db.select().from(GuestGroupTable).orderBy(GuestGroupTable.name),
        adminGroupSave: ({ id, name }: { id?: string; name: string }) => Effect.gen(function* () {
          const trimmed = name.trim();
          if (trimmed.length === 0 || trimmed.length > 200) return yield* new GuestValidationError({ message: "Invalid group name" });
          const rows = yield* (id === undefined
            ? db.insert(GuestGroupTable).values({ name: trimmed }).returning()
            : db.update(GuestGroupTable).set({ name: trimmed }).where(eq(GuestGroupTable.id, id)).returning());
          if (!rows[0]) return yield* new CheckinGuestNotFoundError({});
          return rows[0];
        }),
        adminGroupDelete: ({ id }: { id: string }) => Effect.gen(function* () {
          const rows = yield* db.delete(GuestGroupTable).where(eq(GuestGroupTable.id, id)).returning();
          if (!rows[0]) return yield* new CheckinGuestNotFoundError({});
          return { id };
        }),
        adminMembership: ({ id, groupId }: { id: string; groupId: string | null }) => db.transaction((tx) => Effect.gen(function* () {
          if (groupId !== null) {
            const groups = yield* tx.select().from(GuestGroupTable).where(eq(GuestGroupTable.id, groupId)).for("key share");
            if (!groups[0]) return yield* new CheckinGuestNotFoundError({});
          }
          const rows = yield* tx.update(GuestTable).set({ groupId }).where(eq(GuestTable.id, id)).returning();
          if (!rows[0]) return yield* new CheckinGuestNotFoundError({});
          return toAdminGuest(rows[0]);
        })),
        adminAudit: () => db.select().from(RsvpAuditTable).orderBy(desc(RsvpAuditTable.createdAt), desc(RsvpAuditTable.id)).limit(500).pipe(Effect.map((rows) => rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })))),
        relatedMembers: ({ firstName, lastName }: { firstName: string; lastName: string }) => db.transaction((tx) => Effect.gen(function* () {
          const actors = yield* tx.select().from(GuestTable).where(eq(GuestTable.normalizedName, toGuestFullName(firstName, lastName))).for("share");
          const actor = actors[0];
          if (!actor || actor.invitationStatus !== "Yes") return yield* new CheckinGuestNotFoundError({});
          const links = yield* tx.select().from(GuestRelationshipTable).where(or(eq(GuestRelationshipTable.guestAId, actor.id), eq(GuestRelationshipTable.guestBId, actor.id)));
          const ids = links.map((link) => link.guestAId === actor.id ? link.guestBId : link.guestAId);
          if (!ids.length) return { members: [] };
          const rows = yield* tx.select({ id: GuestTable.id, displayName: GuestTable.displayName, attending: GuestTable.rsvpStatus, rsvpRevision: GuestTable.rsvpRevision }).from(GuestTable)
            .where(and(or(...ids.map((id) => eq(GuestTable.id, id))), eq(GuestTable.invitationStatus, "Yes"), ne(GuestTable.id, actor.id))).orderBy(GuestTable.displayName);
          return { members: rows.map((row) => ({ ...row, attending: row.attending as "" | "Yes" | "No" })) };
        })),
        saveBehalf: ({ input }: { input: BehalfRsvpRequest }) => db.transaction((tx) => Effect.gen(function* () {
          // Deterministic lock ordering prevents reciprocal behalf writes from deadlocking.
          const rows = yield* tx.select().from(GuestTable).where(or(eq(GuestTable.normalizedName, toGuestFullName(input.firstName, input.lastName)), eq(GuestTable.id, input.targetId))).orderBy(GuestTable.id).for("update");
          const actor = rows.find((row) => row.normalizedName === toGuestFullName(input.firstName, input.lastName));
          const target = rows.find((row) => row.id === input.targetId);
          if (!actor || !target || actor.id === target.id || actor.invitationStatus !== "Yes" || target.invitationStatus !== "Yes") return yield* new CheckinGuestNotFoundError({});
          const [guestAId, guestBId] = [actor.id, target.id].sort() as [string, string];
          const links = yield* tx.select().from(GuestRelationshipTable).where(and(eq(GuestRelationshipTable.guestAId, guestAId), eq(GuestRelationshipTable.guestBId, guestBId)));
          if (!links.length) return yield* new CheckinGuestNotFoundError({});
          if (target.rsvpRevision !== input.expectedRevision) return yield* new RsvpConflictError({});
          if ((input.attending !== "Yes" && input.attending !== "No") || (input.notes?.length ?? 0) > NOTES_MAX_LENGTH) return yield* new GuestValidationError({ message: "Invalid RSVP" });
          yield* tx.execute(sql`select set_config('wedding.actor_guest_id', ${actor.id}, true)`);
          const updated = yield* tx.update(GuestTable).set({ rsvpStatus: input.attending, ...(input.notes === undefined ? {} : { rsvpNotes: input.notes.trim() }) }).where(eq(GuestTable.id, target.id)).returning();
          const row = updated[0]!;
          return { id: row.id, displayName: row.displayName, attending: row.rsvpStatus as "Yes" | "No", rsvpRevision: row.rsvpRevision };
        })),
        findEligibleByName,
        getRsvp: Effect.fn("GuestRepository.getRsvp")(function* ({
          firstName,
          lastName,
        }: {
          readonly firstName: string;
          readonly lastName: string;
        }) {
          const guest = yield* findEligibleByName({ firstName, lastName });
          // Defensive length check; never log values.
          if ((guest.rsvpEmail ?? "").length > EMAIL_MAX_LENGTH || (guest.rsvpNotes ?? "").length > NOTES_MAX_LENGTH) {
            return yield* new CheckinGuestNotFoundError({});
          }
          const attending = guest.rsvpStatus ?? "";
          return {
            firstName,
            lastName,
            attending: (attending === "Yes" || attending === "No" ? attending : "") as "" | "Yes" | "No",
            email: guest.rsvpEmail ?? "",
            notes: guest.rsvpNotes ?? "",
            rsvpRevision: guest.rsvpRevision,
          };
        }),
        saveRsvp: Effect.fn("GuestRepository.saveRsvp")(function* ({
          input,
        }: {
          readonly input: RsvpRespondRequest;
        }) {
          const email = input.email.trim();
          const notes = input.notes.trim();
          if (!isValidEmail(email) || notes.length > NOTES_MAX_LENGTH) {
            return yield* new GuestValidationError({ message: "Invalid RSVP email or notes" });
          }
          if (input.attending !== "Yes" && input.attending !== "No") {
            return yield* new GuestValidationError({ message: "Invalid attendance" });
          }

          const guest = yield* findEligibleByName({ firstName: input.firstName, lastName: input.lastName });
          const rows = yield* db.transaction((tx) => Effect.gen(function* () {
            const locked = yield* tx.select().from(GuestTable).where(eq(GuestTable.id, guest.id)).for("update");
            const current = locked[0];
            if (!current || current.invitationStatus !== "Yes" || current.normalizedName !== toGuestFullName(input.firstName, input.lastName)) return yield* new CheckinGuestNotFoundError({});
            if (current.rsvpRevision !== input.expectedRevision) return yield* new RsvpConflictError({});
            yield* tx.execute(sql`select set_config('wedding.actor_guest_id', ${guest.id}, true)`);
            return yield* tx
            .update(GuestTable)
            .set({ rsvpStatus: input.attending, rsvpEmail: email, rsvpNotes: notes })
            .where(eq(GuestTable.id, guest.id))
            .returning();
          }));

          const updated = rows[0];
          if (updated === undefined) {
            return yield* new CheckinGuestNotFoundError({});
          }
          yield* Effect.logInfo("RSVP updated", { id: updated.id });
          return {
            id: updated.id,
            firstName: input.firstName,
            lastName: input.lastName,
            attending: input.attending,
            email,
            notes,
            rsvpRevision: updated.rsvpRevision,
            // Persistence is immediate; the configured hourly snapshot is deferred.
            spreadsheetStatus: sheetsConfig.configured ? "queued" as const : "not-configured" as const,
          };
        }),
        adminList: Effect.fn("GuestRepository.adminList")(function* ({
          input,
        }: {
          readonly input: {
            readonly page?: number | undefined;
            readonly pageSize?: number | undefined;
            readonly search?: string | undefined;
            readonly invitationStatus?: string | undefined;
            readonly guestType?: string | undefined;
            readonly ownerKey?: string | undefined;
          };
        }) {
          const page = Math.max(1, Math.floor(input.page ?? 1));
          const pageSize = Math.min(1000, Math.max(1, Math.floor(input.pageSize ?? 50)));
          const search = input.search?.trim();
          const likePattern = search === undefined || search.length === 0 ? undefined : `%${escapeLikePattern(search)}%`;
          const where = and(
            input.invitationStatus === undefined ? undefined : eq(GuestTable.invitationStatus, input.invitationStatus),
            input.guestType === undefined ? undefined : eq(GuestTable.guestType, input.guestType),
            input.ownerKey === undefined ? undefined : eq(GuestTable.ownerKey, input.ownerKey),
            likePattern === undefined
              ? undefined
              : or(
                ilike(GuestTable.displayName, likePattern),
                ilike(GuestTable.nickname, likePattern),
                ilike(GuestTable.internalNotes, likePattern),
                ilike(GuestTable.rsvpEmail, likePattern),
              ),
          );
          const [totalRows, rows] = yield* Effect.all([
            db.select({ total: count() }).from(GuestTable).where(where),
            db
              .select()
              .from(GuestTable)
              .where(where)
              .orderBy(desc(GuestTable.updatedAt), GuestTable.displayName)
              .limit(pageSize)
              .offset((page - 1) * pageSize),
          ]);
          return {
            guests: rows.map(toAdminGuest),
            total: totalRows[0]?.total ?? 0,
            page,
            pageSize,
          };
        }),
        adminGet: Effect.fn("GuestRepository.adminGet")(function* ({ id }: { readonly id: string }) {
          const rows = yield* db.select().from(GuestTable).where(eq(GuestTable.id, id)).limit(1);
          const row = rows[0];
          if (row === undefined) {
            return yield* new CheckinGuestNotFoundError({ });
          }
          return toAdminGuest(row);
        }),
        adminCreate: Effect.fn("GuestRepository.adminCreate")(function* ({
          input,
        }: {
          readonly input: {
            readonly displayName: string;
            readonly nickname?: string | undefined;
            readonly invitationStatus: string;
            readonly guestType: string;
            readonly ownerKey: string;
            readonly internalNotes?: string | undefined;
          };
        }) {
          const displayName = input.displayName.trim().replace(/\s+/g, " ");
          const internalNotes = (input.internalNotes ?? "").trim();
          const nickname = (input.nickname ?? "").trim();
          if (nickname.length > DISPLAY_NAME_MAX_LENGTH) {
            return yield* new GuestValidationError({ message: "Invalid nickname" });
          }
          if (displayName.length < 1 || displayName.length > DISPLAY_NAME_MAX_LENGTH) {
            return yield* new GuestValidationError({ message: "Invalid display name" });
          }
          if (
            !isInvitationStatus(input.invitationStatus) ||
            !isGuestType(input.guestType) ||
            !isOwnerKey(input.ownerKey) ||
            internalNotes.length > INTERNAL_NOTES_MAX_LENGTH
          ) {
            return yield* new GuestValidationError({ message: "Invalid guest fields" });
          }
          const normalizedName = normalizeDisplayName(displayName);
          const inserted = yield* db
            .insert(GuestTable)
            .values({
              id: randomUUID(),
              displayName,
              nickname,
              normalizedName,
              invitationStatus: input.invitationStatus,
              guestType: input.guestType,
              ownerKey: input.ownerKey,
              internalNotes,
            })
            .returning()
            .pipe(Effect.mapError(() => new GuestValidationError({ message: "Guest already exists" })));
          const row = inserted[0];
          if (row === undefined) {
            return yield* new GuestValidationError({ message: "Guest already exists" });
          }
          return toAdminGuest(row);
        }),
        adminUpdate: Effect.fn("GuestRepository.adminUpdate")(function* ({
          id,
          input,
        }: {
          readonly id: string;
          readonly input: {
            readonly displayName?: string | undefined;
            readonly nickname?: string | undefined;
            readonly invitationStatus?: string | undefined;
            readonly guestType?: string | undefined;
            readonly ownerKey?: string | undefined;
            readonly internalNotes?: string | undefined;
            readonly rsvpStatus?: string | undefined;
            readonly rsvpEmail?: string | undefined;
            readonly rsvpNotes?: string | undefined;
            readonly expectedRevision?: number | undefined;
          };
        }) {
          const patch: Partial<typeof GuestTable.$inferInsert> = {};
          if (input.nickname !== undefined) {
            const nickname = input.nickname.trim();
            if (nickname.length > DISPLAY_NAME_MAX_LENGTH) {
              return yield* new GuestValidationError({ message: "Invalid nickname" });
            }
            patch.nickname = nickname;
          }
          if (input.displayName !== undefined) {
            const displayName = input.displayName.trim().replace(/\s+/g, " ");
            if (displayName.length < 1 || displayName.length > DISPLAY_NAME_MAX_LENGTH) {
              return yield* new GuestValidationError({ message: "Invalid display name" });
            }
            patch.displayName = displayName;
            patch.normalizedName = normalizeDisplayName(displayName);
          }
          if (input.invitationStatus !== undefined) {
            if (!isInvitationStatus(input.invitationStatus)) {
              return yield* new GuestValidationError({ message: "Invalid invitation status" });
            }
            patch.invitationStatus = input.invitationStatus;
          }
          if (input.guestType !== undefined) {
            if (!isGuestType(input.guestType)) {
              return yield* new GuestValidationError({ message: "Invalid guest type" });
            }
            patch.guestType = input.guestType;
          }
          if (input.ownerKey !== undefined) {
            if (!isOwnerKey(input.ownerKey)) {
              return yield* new GuestValidationError({ message: "Invalid owner key" });
            }
            patch.ownerKey = input.ownerKey;
          }
          if (input.internalNotes !== undefined) {
            const internalNotes = input.internalNotes.trim();
            if (internalNotes.length > INTERNAL_NOTES_MAX_LENGTH) {
              return yield* new GuestValidationError({ message: "Invalid internal notes" });
            }
            patch.internalNotes = internalNotes;
          }
          if (input.rsvpStatus !== undefined) {
            if (!isRsvpStatus(input.rsvpStatus)) {
              return yield* new GuestValidationError({ message: "Invalid RSVP status" });
            }
            patch.rsvpStatus = input.rsvpStatus;
          }
          if (input.rsvpEmail !== undefined) {
            const rsvpEmail = input.rsvpEmail.trim();
            if (rsvpEmail.length > EMAIL_MAX_LENGTH || (rsvpEmail.length > 0 && !EMAIL_PATTERN.test(rsvpEmail))) {
              return yield* new GuestValidationError({ message: "Invalid RSVP email" });
            }
            patch.rsvpEmail = rsvpEmail;
          }
          if (input.rsvpNotes !== undefined) {
            const rsvpNotes = input.rsvpNotes.trim();
            if (rsvpNotes.length > NOTES_MAX_LENGTH) {
              return yield* new GuestValidationError({ message: "Invalid RSVP notes" });
            }
            patch.rsvpNotes = rsvpNotes;
          }

          if (Object.keys(patch).length === 0) {
            const current = yield* db.select().from(GuestTable).where(eq(GuestTable.id, id)).limit(1);
            const existing = current[0];
            if (existing === undefined) {
              return yield* new CheckinGuestNotFoundError({});
            }
            return toAdminGuest(existing);
          }

          const rows = yield* db.transaction((tx) => Effect.gen(function* () {
            const current = yield* tx.select().from(GuestTable).where(eq(GuestTable.id, id)).for("update");
            if (!current[0]) return yield* new CheckinGuestNotFoundError({});
            const hasRsvpMutation = (patch.rsvpStatus !== undefined && patch.rsvpStatus !== current[0].rsvpStatus)
              || (patch.rsvpEmail !== undefined && patch.rsvpEmail !== current[0].rsvpEmail)
              || (patch.rsvpNotes !== undefined && patch.rsvpNotes !== current[0].rsvpNotes);
            if (hasRsvpMutation && input.expectedRevision === undefined) return yield* new GuestValidationError({ message: "Expected RSVP revision is required" });
            if (hasRsvpMutation && current[0].rsvpRevision !== input.expectedRevision) return yield* new RsvpConflictError({});
            return yield* tx.update(GuestTable).set(patch).where(eq(GuestTable.id, id)).returning()
              .pipe(Effect.mapError(() => new GuestValidationError({ message: "Guest already exists" })));
          }));
          const row = rows[0];
          if (row === undefined) {
            return yield* new CheckinGuestNotFoundError({});
          }
          return toAdminGuest(row);
        }),
        adminDelete: Effect.fn("GuestRepository.adminDelete")(function* ({ id }: { readonly id: string }) {
          const rows = yield* db.delete(GuestTable).where(eq(GuestTable.id, id)).returning({ id: GuestTable.id });
          if (rows[0] === undefined) {
            return yield* new CheckinGuestNotFoundError({});
          }
          return { id };
        }),
      } as const;
    }),
  },
) {
  static readonly layer = Layer.effect(
    GuestRepository,
  )(GuestRepository.make).pipe(Layer.provide(SheetsSyncConfig.layer));
}
