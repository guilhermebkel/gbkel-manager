import { describe, expect, it } from "vitest";
import { LocalPathUtil } from "#app/Utils/LocalPathUtil.ts";

describe("LocalPathUtil.listCandidates()", () => {
  it("lists the file, the file with .html and the folder index, in that order", () => {
    const candidates = LocalPathUtil.listCandidates("/pages/mail");

    expect(candidates).toStrictEqual(["pages/mail", "pages/mail.html", "pages/mail/index.html"]);
  });

  it("ignores the query string and the fragment", () => {
    const candidates = LocalPathUtil.listCandidates("/static/css/font.css?v=2#top");

    expect(candidates[0]).toBe("static/css/font.css");
  });

  it("decodes an encoded name", () => {
    const candidates = LocalPathUtil.listCandidates("/static/my%20file.png");

    expect(candidates[0]).toBe("static/my file.png");
  });

  it.each([
    ["a parent segment", "/static/../package.json"],
    ["an encoded parent segment", "/static/%2e%2e/package.json"],
    ["an encoded slash trick", "/static/..%2F..%2Fpackage.json"],
    ["a backslash", "/static/..\\package.json"],
    ["a null byte", "/static/a%00.png"],
    ["a folder that is not published", "/src/Setup/EnvSetup.ts"],
    ["a broken escape", "/static/%E0%A4%A"],
    ["the root", "/"],
  ])("refuses %s", (_name, target) => {
    expect(LocalPathUtil.listCandidates(target)).toStrictEqual([]);
  });
});

describe("LocalPathUtil.isRedirectsPage()", () => {
  it("recognizes the generated page, with or without a query string", () => {
    expect([LocalPathUtil.isRedirectsPage("/redirects.html"), LocalPathUtil.isRedirectsPage("/redirects.html?x=1")]).toStrictEqual([true, true]);
  });

  it("does not take another page for it", () => {
    expect(LocalPathUtil.isRedirectsPage("/pages/redirects.html")).toBe(false);
  });
});
