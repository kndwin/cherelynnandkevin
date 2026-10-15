import { Exit, Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  RsvpAuthenticateResponseSchema,
  RsvpRespondRequestSchema,
  RsvpResponseSchema,
} from "@cherelynnandkevin/client-api-contract/check-in/http";

const baseRequest = {
  expectedRevision: 0,
  firstName: "Kevin",
  lastName: "Sucasa",
  sitePassword: "kc27",
  attending: "Yes",
  email: "kevin@example.com",
  notes: "Can't wait!",
} as const;

describe("RsvpRespondRequestSchema", () => {
  it("requires the current RSVP revision", () => {
    const { expectedRevision: _revision, ...missing } = baseRequest;
    expect(Exit.isFailure(Schema.decodeUnknownExit(RsvpRespondRequestSchema)(missing))).toBe(true);
  });
  it("accepts a trimmed email with optional notes", () => {
    const result = Schema.decodeUnknownExit(RsvpRespondRequestSchema)(baseRequest);
    expect(Exit.isSuccess(result)).toBe(true);
  });

  it("accepts empty notes", () => {
    const result = Schema.decodeUnknownExit(RsvpRespondRequestSchema)({ ...baseRequest, notes: "" });
    expect(Exit.isSuccess(result)).toBe(true);
  });

  it("rejects empty or malformed email", () => {
    for (const email of ["", "not-an-email", "a@b", "a @b.com", "a@b com"]) {
      const result = Schema.decodeUnknownExit(RsvpRespondRequestSchema)({ ...baseRequest, email });
      expect(Exit.isFailure(result)).toBe(true);
    }
  });

  it("rejects over-limit email and notes", () => {
    const longEmail = `${"a".repeat(250)}@b.co`;
    expect(
      Exit.isFailure(Schema.decodeUnknownExit(RsvpRespondRequestSchema)({ ...baseRequest, email: longEmail })),
    ).toBe(true);
    expect(
      Exit.isFailure(
        Schema.decodeUnknownExit(RsvpRespondRequestSchema)({ ...baseRequest, notes: "n".repeat(1001) }),
      ),
    ).toBe(true);
  });
});

describe("RsvpAuthenticateResponseSchema", () => {
  it("accepts stored RSVP values alongside names", () => {
    const result = Schema.decodeUnknownExit(RsvpAuthenticateResponseSchema)({
      firstName: "Kevin",
      lastName: "Sucasa",
      attending: "Yes",
      email: "kevin@example.com",
      notes: "Can't wait!",
    });
    expect(Exit.isSuccess(result)).toBe(true);
  });

  it("accepts a blank stored RSVP (empty form)", () => {
    const result = Schema.decodeUnknownExit(RsvpAuthenticateResponseSchema)({
      firstName: "Kevin",
      lastName: "Sucasa",
      attending: "",
      email: "",
      notes: "",
    });
    expect(Exit.isSuccess(result)).toBe(true);
  });

  it("rejects missing or invalid stored values", () => {
    for (
      const response of [
        { firstName: "Kevin", lastName: "Sucasa", attending: "Yes", email: "kevin@example.com" },
        { firstName: "Kevin", lastName: "Sucasa", attending: "Maybe", email: "", notes: "" },
        { firstName: "Kevin", lastName: "Sucasa", attending: "Yes", email: 42, notes: "" },
      ]
    ) {
      expect(Exit.isFailure(Schema.decodeUnknownExit(RsvpAuthenticateResponseSchema)(response))).toBe(true);
    }
  });
});

describe("RsvpResponseSchema", () => {
  it("distinguishes unavailable or queued spreadsheet work from a completed update", () => {
    for (const spreadsheetStatus of ["not-configured", "queued", "updated"]) {
      expect(Exit.isSuccess(Schema.decodeUnknownExit(RsvpResponseSchema)({
        id: "database-guest-id",
        firstName: baseRequest.firstName,
        lastName: baseRequest.lastName,
        attending: baseRequest.attending,
        email: baseRequest.email,
        notes: baseRequest.notes,
        spreadsheetStatus,
      }))).toBe(true);
    }
    expect(Exit.isFailure(Schema.decodeUnknownExit(RsvpResponseSchema)({
      ...baseRequest,
      id: "database-guest-id",
      spreadsheetStatus: "unknown",
    }))).toBe(true);
  });

  it("includes email and notes alongside existing fields", () => {
    const result = Schema.decodeUnknownExit(RsvpResponseSchema)({
      id: "google-sheet-row-7",
      firstName: "Kevin",
      lastName: "Sucasa",
      attending: "No",
      email: "kevin@example.com",
      notes: "",
      spreadsheetStatus: "updated",
    });
    expect(Exit.isSuccess(result)).toBe(true);
  });
});
