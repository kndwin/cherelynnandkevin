import { describe, expect, it } from "vitest";
import { renderConfirmation } from "./index.ts";

describe("RSVP confirmation", () => {
  it.each(["Yes"] as const)("uses the website palette and explicit regular serif typography for %s", async (attending) => {
    const { html } = await renderConfirmation({ displayName: "Guest", email: "guest@example.com", attending, dietaryRequirements: "Vegetarian" });
    expect(html).toContain("background-color:#fffef9");
    expect(html).toContain("color:#37430f");
    expect(html).toContain("background-color:#56651f");
    expect(html).toContain("letter-spacing:2px");
    expect(html).toContain("fonts.gstatic.com/s/fraunces/");
    expect(html).toContain("fonts.gstatic.com/s/quattrocento/");
    const heading = html.match(/<h[1-6]\b[^>]*>/)?.[0];
    expect(heading).toContain("Fraunces");
    expect(heading).toContain("Georgia, serif");
    expect(heading).toContain("font-weight:400");
    expect(heading).toContain("font-size:28px");
    expect(heading).toContain("line-height:42px");
    expect(heading).toContain("letter-spacing:4px");
    expect(heading).toContain("text-transform:uppercase");
    const button = html.match(/<a\b[^>]*>/)?.[0];
    expect(button).toContain("display:block");
    expect(button).toContain("border-radius:0");
    expect(button).toContain("font-weight:700");
    expect(button).toContain("text-transform:uppercase");
    for (const text of html.match(/<(?:p|h[1-6]|a)\b[^>]*>/g) ?? []) {
      expect(text).toMatch(/font-weight:(400|700)/);
      expect(text).toMatch(/font-size:\d+px/);
      expect(text).toMatch(/line-height:\d+px/);
    }
    expect(html).toContain("max-width:560px");
    expect(html).toContain("width:100%");
  });
  it.each(["Yes"] as const)("renders safe HTML and text for %s", async (attending) => {
    const result = await renderConfirmation({ displayName: '<script>alert("name")</script>', email: "guest@example.com", attending, dietaryRequirements: "<img src=x onerror=alert(1)>" });
    expect(result.html).not.toContain("<script>");
    expect(result.html).not.toContain("<img src=x");
    expect(result.html).toContain("&lt;script&gt;");
    expect(result.text).toContain("https://cherelynnandkevin.com");
    expect(result.subject).toContain("RSVP");
    expect(result.text).toContain("you’re joining us");
    expect(result.text).not.toContain("unable to attend");
    if (attending === "Yes") {
      expect(result.text).toContain("4 September 2027");
      expect(result.text).toContain("1:30 pm (Australia/Sydney)");
      expect(result.text).toContain("Ravensthorpe");
    }
  });
});
