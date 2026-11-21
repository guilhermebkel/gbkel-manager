import { describe, expect, it } from "vitest";
import { HtmlUtil } from "#app/Utils/HtmlUtil.ts";

describe("HtmlUtil.escape()", () => {
  it("escapes the characters that could open a tag or end an attribute", () => {
    const escaped = HtmlUtil.escape("<a href=\"x\">&</a>");

    expect(escaped).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
  });

  it("leaves plain text alone", () => {
    const escaped = HtmlUtil.escape("static/css/font.css");

    expect(escaped).toBe("static/css/font.css");
  });
});
