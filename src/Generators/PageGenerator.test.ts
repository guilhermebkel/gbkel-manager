import { describe, expect, it } from "vitest";
import { PageGenerator } from "#app/Generators/PageGenerator.ts";

describe("PageGenerator.generate()", () => {
  it("keeps a page name that closes the script out of the script", () => {
    const html = PageGenerator.generate({ pageName: "</script><b>", body: "" });

    expect(html).toContain("pageName: \"\\u003c/script>\\u003cb>\" }");
  });

  it("adds the style only when there is one", () => {
    const withStyle = PageGenerator.generate({ pageName: "A", body: "", style: "p { color: red; }" });
    const withoutStyle = PageGenerator.generate({ pageName: "A", body: "" });

    expect(withStyle).toContain("<style>p { color: red; }</style>");
    expect(withoutStyle).not.toContain("<style>");
  });
});
