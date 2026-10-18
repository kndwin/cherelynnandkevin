import { describe, expect, it } from "vitest";
import { renderConfirmation } from "./index.ts";

describe("RSVP confirmation", () => {
  it.each(["Yes"] as const)("uses the website palette and explicit regular serif typography for %s", async (attending) => {
    const { html } = await renderConfirmation({ displayName: "Guest", email: "guest@example.com", attending, dietaryRequirements: "Vegetarian" });
    expect(html).toContain("background-color:#fffef9");
    expect(html).toContain("color:#37430f");
    expect(html).toContain("background-color:#56651f");
    expect(html).toContain("letter-spacing:2px");
    expect(html).toContain("https://cherelynnandkevin.com/assets/fraunces-latin-wght-normal-ukD16Tqj.woff2");
    expect(html).toContain("https://cherelynnandkevin.com/assets/quattrocento-latin-400-normal-Da3aNouX.woff2");
    expect(html).toContain("https://cherelynnandkevin.com/assets/quattrocento-latin-700-normal-BdsJF-a_.woff2");
    expect(html).toContain('Quattrocento');
    expect(html).not.toContain("fonts.gstatic.com");
    const heading = html.match(/<h[1-6]\b[^>]*>/)?.[0];
    expect(heading).toContain("Fraunces Variable");
    expect(heading).toContain("Georgia, serif");
    expect(heading).toContain("font-weight:200");
    expect(heading).toContain("font-size:28px");
    expect(heading).toContain("line-height:42px");
    expect(heading).toContain("letter-spacing:0.18em");
    expect(heading).toContain("text-transform:uppercase");
    const button = html.match(/<a\b[^>]*href="https:\/\/cherelynnandkevin.com"[^>]*>/)?.[0];
    expect(button).toContain("display:block");
    expect(button).toContain("border-radius:0");
    expect(button).toContain("font-weight:700");
    expect(button).toContain("text-transform:uppercase");
    for (const text of html.match(/<(?:p|h[1-6]|a)\b[^>]*>/g) ?? []) {
      expect(text).toMatch(/font-weight:(200|400|700)/);
      expect(text).toMatch(/font-size:\d+px/);
      expect(text).toMatch(/line-height:\d+px/);
    }
    expect(html).toContain("max-width:560px");
    expect(html).toContain("width:100%");
    const weddingDetails = html.match(/<p\b[^>]*>Saturday, 4 September 2027[\s\S]*?<\/p>/)?.[0];
    expect(weddingDetails).toBeDefined();
    expect(weddingDetails).toContain("Dietary requirements: <!-- -->Vegetarian");
    expect(weddingDetails).not.toMatch(/border(?:-top|-bottom)?\s*:/);
  });
  it.each(["Yes"] as const)("renders safe HTML and text for %s", async (attending) => {
    const result = await renderConfirmation({ displayName: '<script>alert("name")</script>', email: "guest@example.com", attending, dietaryRequirements: "<img src=x onerror=alert(1)>" });
    expect(result.html).not.toContain("<script>");
    expect(result.html).not.toContain("<img src=x");
    expect(result.html).toContain("&lt;script&gt;");
    expect(result.text).toContain("https://cherelynnandkevin.com");
    expect(result.subject).toContain("RSVP");
    expect(result.html).toContain("We’ve received your RSVP, thanks for joining us!");
    expect(result.text).toContain("We’ve received your RSVP, thanks for joining us!");
    expect(result.text).not.toContain("Your RSVP is saved — you’re joining us!");
    expect(result.text).not.toContain("unable to attend");
    if (attending === "Yes") {
      expect(result.text).toContain("4 September 2027");
      expect(result.text).toContain("Ceremony at 1:30 pm (Sydney Time)");
      expect(result.text).toContain("Ravensthorpe Estate");
    }
  });
  it("links only the venue label without a separate map call to action", async () => {
    const { html, text } = await renderConfirmation({ displayName: "Guest", email: "guest@example.com", attending: "Yes", dietaryRequirements: "" });
    const mapUrl = "https://maps.google.com/maps?q=Ravensthorpe+Estate+Albion+Park+NSW+Australia";
    expect(html).toContain(`href="${mapUrl}"`);
    expect(html).toMatch(/<a\b[^>]*>Ravensthorpe Estate<\/a>/);
    expect(html).not.toContain("↗");
    expect(html).not.toContain("View on Google Maps");
    expect(html.split(`href="${mapUrl}"`)).toHaveLength(2);
    expect(html).toContain("Ceremony at 1:30 pm (Sydney Time)");
    expect(text).toContain("Ravensthorpe Estate");
    expect(text).not.toContain("↗");
    expect(text).not.toContain("View on Google Maps");
    expect(text).toContain(mapUrl);
    expect(html).not.toMatch(/<iframe|<script|maps\/api\/staticmap|output=embed/i);
    expect(text).not.toContain("Australia/Sydney");
  });
});
