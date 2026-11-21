import { describe, expect, it } from "vitest";
import { RedirectsPageGenerator } from "#app/Generators/RedirectsPageGenerator.ts";

describe("RedirectsPageGenerator.generate()", () => {
  it("lists every alias as the https rule it serves", () => {
    const html = RedirectsPageGenerator.generate([
      { from: "a.example.com", to: "https://b.test/?x=1&y=2", statusCode: 301 },
      { from: "c.example.com/*", to: "https://d.test/:splat", statusCode: 200 },
    ]);

    expect(html).toContain("<p>https://a.example.com https://b.test/?x=1&amp;y=2 301!</p>\n<p>https://c.example.com/* https://d.test/:splat 200!</p>");
  });
});
