import { describe, expect, it } from "vitest";
import {
  escapeLikePattern,
  isEligibleInvitationStatus,
  normalizeDisplayName,
  normalizeGuestName,
  toGuestFullName,
} from "./guest-name.ts";

describe("normalizeGuestName", () => {
  it("trims, lowercases, and collapses whitespace", () => {
    expect(normalizeGuestName("  Kevin   Sucasa ")).toBe("kevin sucasa");
    expect(normalizeGuestName("CHERELYNN\tOLIVO")).toBe("cherelynn olivo");
    expect(normalizeGuestName("")).toBe("");
  });

  it("keeps punctuation intact", () => {
    expect(normalizeGuestName("Adrian's  Dad")).toBe("adrian's dad");
    expect(normalizeGuestName("Bec (Jay's Wife)")).toBe("bec (jay's wife)");
  });
});

describe("toGuestFullName", () => {
  it("joins first and last names before normalizing", () => {
    expect(toGuestFullName("  Kevin ", " Sucasa  ")).toBe("kevin sucasa");
    expect(toGuestFullName("", "")).toBe("");
  });

  it("matches stored display names for single-name guests", () => {
    expect(toGuestFullName("Netanya", "")).toBe("netanya");
    expect(toGuestFullName("", "Netanya")).toBe("netanya");
  });
});

describe("normalizeDisplayName", () => {
  it("is the lookup key for a canonical display name", () => {
    expect(normalizeDisplayName("  Melissa Yeung's BF ")).toBe("melissa yeung's bf");
  });
});

describe("escapeLikePattern", () => {
  it("escapes %, _, and backslash so searches match literally", () => {
    expect(escapeLikePattern("100% sure_under\\done")).toBe("100\\% sure\\_under\\\\done");
    expect(escapeLikePattern("plain name")).toBe("plain name");
    expect(escapeLikePattern("")).toBe("");
  });
});

describe("isEligibleInvitationStatus", () => {
  it("allows only Tier Yes to public-authenticate", () => {
    expect(isEligibleInvitationStatus("Yes")).toBe(true);
    expect(isEligibleInvitationStatus("Maybe")).toBe(false);
    expect(isEligibleInvitationStatus("")).toBe(false);
    expect(isEligibleInvitationStatus("yes")).toBe(false);
  });
});
