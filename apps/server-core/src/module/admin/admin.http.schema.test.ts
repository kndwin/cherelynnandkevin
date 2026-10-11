import { Exit, Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  AdminCreateGuestRequestSchema,
  AdminGuestSchema,
  AdminListGuestsQuerySchema,
  AdminLoginRequestSchema,
  AdminUpdateGuestRequestSchema,
} from "@cherelynnandkevin/client-api-contract/admin/http";

const guest = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  displayName: "Kevin Sucasa",
  invitationStatus: "Yes",
  guestType: "Church",
  ownerKey: "Kevin",
  internalNotes: "",
  rsvpStatus: "Yes",
  rsvpEmail: "kevin@example.com",
  rsvpNotes: "Can't wait!",
} as const;

describe("AdminGuestSchema", () => {
  it("accepts a full guest including internal notes", () => {
    const result = Schema.decodeUnknownExit(AdminGuestSchema)({
      ...guest,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    expect(Exit.isSuccess(result)).toBe(true);
  });

  it("rejects invalid enums and non-UUID ids", () => {
    for (
      const patch of [
        { invitationStatus: "No" },
        { guestType: "Neighbors" },
        { ownerKey: "Sam" },
        { rsvpStatus: "Maybe" },
        { id: "not-a-uuid" },
      ]
    ) {
      const result = Schema.decodeUnknownExit(AdminGuestSchema)({
        ...guest,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        ...patch,
      });
      expect(Exit.isFailure(result)).toBe(true);
    }
  });
});

describe("AdminListGuestsQuerySchema", () => {
  it("decodes string query params with coercion", () => {
    const result = Schema.decodeUnknownExit(AdminListGuestsQuerySchema)({
      page: "2",
      pageSize: "25",
      search: "kevin",
      invitationStatus: "Yes",
    });
    expect(Exit.isSuccess(result)).toBe(true);
    if (Exit.isSuccess(result)) {
      expect(result.value).toMatchObject({ page: 2, pageSize: 25, search: "kevin", invitationStatus: "Yes" });
    }
  });

  it("accepts an empty query", () => {
    expect(Exit.isSuccess(Schema.decodeUnknownExit(AdminListGuestsQuerySchema)({}))).toBe(true);
  });

  it("rejects out-of-range pages and invalid filters", () => {
    for (
      const query of [
        { page: "0" },
        { pageSize: "201" },
        { pageSize: "abc" },
        { invitationStatus: "No" },
        { guestType: "Neighbors" },
      ]
    ) {
      expect(Exit.isFailure(Schema.decodeUnknownExit(AdminListGuestsQuerySchema)(query))).toBe(true);
    }
  });
});

describe("AdminCreateGuestRequestSchema", () => {
  it("accepts source columns with optional internal notes", () => {
    const result = Schema.decodeUnknownExit(AdminCreateGuestRequestSchema)({
      displayName: "New Guest",
      invitationStatus: "Maybe",
      guestType: "Friends",
      ownerKey: "Cher",
    });
    expect(Exit.isSuccess(result)).toBe(true);
  });

  it("rejects blank names and invalid enums", () => {
    for (
      const body of [
        { displayName: "", invitationStatus: "Yes", guestType: "Friends", ownerKey: "Cher" },
        { displayName: "New Guest", invitationStatus: "No", guestType: "Friends", ownerKey: "Cher" },
        { displayName: "New Guest", invitationStatus: "Yes", guestType: "Friends", ownerKey: "Sam" },
        { displayName: "n".repeat(201), invitationStatus: "Yes", guestType: "Friends", ownerKey: "Cher" },
      ]
    ) {
      expect(Exit.isFailure(Schema.decodeUnknownExit(AdminCreateGuestRequestSchema)(body))).toBe(true);
    }
  });
});

describe("AdminUpdateGuestRequestSchema", () => {
  it("accepts partial edits including RSVP reset", () => {
    expect(
      Exit.isSuccess(Schema.decodeUnknownExit(AdminUpdateGuestRequestSchema)({ rsvpStatus: "", rsvpEmail: "" })),
    ).toBe(true);
    expect(
      Exit.isSuccess(Schema.decodeUnknownExit(AdminUpdateGuestRequestSchema)({ displayName: "Renamed Guest" })),
    ).toBe(true);
  });

  it("rejects over-limit emails and notes", () => {
    expect(
      Exit.isFailure(
        Schema.decodeUnknownExit(AdminUpdateGuestRequestSchema)({ rsvpEmail: `${"a".repeat(250)}@b.co` }),
      ),
    ).toBe(true);
    expect(
      Exit.isFailure(Schema.decodeUnknownExit(AdminUpdateGuestRequestSchema)({ rsvpNotes: "n".repeat(1001) })),
    ).toBe(true);
    expect(
      Exit.isFailure(Schema.decodeUnknownExit(AdminUpdateGuestRequestSchema)({ internalNotes: "n".repeat(2001) })),
    ).toBe(true);
  });
});

describe("AdminLoginRequestSchema", () => {
  it("accepts a password and rejects empty input", () => {
    expect(Exit.isSuccess(Schema.decodeUnknownExit(AdminLoginRequestSchema)({ password: "secret" }))).toBe(true);
    expect(Exit.isFailure(Schema.decodeUnknownExit(AdminLoginRequestSchema)({ password: "" }))).toBe(true);
    expect(Exit.isFailure(Schema.decodeUnknownExit(AdminLoginRequestSchema)({}))).toBe(true);
  });
});
