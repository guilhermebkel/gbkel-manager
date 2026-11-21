import { describe, expect, it } from "vitest";
import { FolderPageGenerator } from "#app/Generators/FolderPageGenerator.ts";

describe("FolderPageGenerator.generate()", () => {
  it("links a folder in the same tab and a file in a new one", () => {
    const html = FolderPageGenerator.generate([
      { kind: "folder", name: "css", relativePath: "/css" },
      { kind: "file", name: "font.css", relativePath: "/css/font.css" },
    ]);

    expect(html).toContain("<a href=\"/css\" target=\"_self\"><br>/css</br></a><br></br>\n<a href=\"/css/font.css\" target=\"_blank\">font.css</a>");
  });

  it("escapes a name that would break the markup", () => {
    const html = FolderPageGenerator.generate([{ kind: "file", name: "<b>.js", relativePath: "/\"x" }]);

    expect(html).toContain("<a href=\"/&quot;x\" target=\"_blank\">&lt;b&gt;.js</a>");
  });

  it("loads the shared script and renders the head and the background", () => {
    const html = FolderPageGenerator.generate([]);

    expect(html).toContain("<script src=\"https://static.guilherr.me/js/default.js\"></script>");
    expect(html).toContain("renderDefaultHead({ pageName: \"Static\" }); renderDefaultBackground({ selector: \"body\" });");
  });
});
