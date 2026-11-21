import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { Alias } from "#app/Protocols/AliasProtocol.ts";
import { LocalFilesSetup } from "#app/Setup/LocalFilesSetup.ts";

const prefix = join(tmpdir(), "local-files-");
const root = mkdtempSync(prefix);
mkdirSync(join(root, "static/css"), { recursive: true });
mkdirSync(join(root, "pages"), { recursive: true });
writeFileSync(join(root, "static/css/font.css"), "body { margin: 0; }");
writeFileSync(join(root, "static/logo.png"), "png-bytes");
writeFileSync(join(root, "pages/mail.html"), "<p>mail</p>");
writeFileSync(join(root, "secret.txt"), "never served");

const ALIASES: Alias[] = [{ from: "a.example.com", to: "https://a.test?x=1&y=2", statusCode: 301 }];

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("LocalFilesSetup.serve()", () => {
  it("serves a static file with its content type", async () => {
    const response = await LocalFilesSetup.serve("/static/css/font.css", ALIASES, root);

    expect([response.status, response.headers.get("content-type"), await response.text()]).toStrictEqual([
      200,
      "text/css; charset=utf-8",
      "body { margin: 0; }",
    ]);
  });

  it("serves a page without its extension, as a clean URL", async () => {
    const response = await LocalFilesSetup.serve("/pages/mail", ALIASES, root);

    expect([response.status, await response.text()]).toStrictEqual([200, "<p>mail</p>"]);
  });

  it("lists a static folder with links relative to the static root", async () => {
    const response = await LocalFilesSetup.serve("/static/css", ALIASES, root);
    const html = await response.text();

    expect(html).toContain("<a href=\"/css/font.css\" target=\"_blank\">font.css</a>");
  });

  it("lists the static root itself", async () => {
    const response = await LocalFilesSetup.serve("/static/", ALIASES, root);
    const html = await response.text();

    expect(html).toContain("<a href=\"/css\" target=\"_self\"><br>/css</br></a>");
  });

  it("builds the redirects page from the aliases it was given, not from a file", async () => {
    const response = await LocalFilesSetup.serve("/redirects.html", ALIASES, root);
    const html = await response.text();

    expect(html).toContain("<p>https://a.example.com https://a.test?x=1&amp;y=2 301!</p>");
  });

  it.each([
    ["a missing file", "/static/nope.css"],
    ["a file outside the published folders", "/secret.txt"],
    ["a parent segment", "/static/../secret.txt"],
    ["an encoded parent segment", "/static/%2e%2e/secret.txt"],
    ["a page folder, which is never listed", "/pages"],
  ])("answers 404 for %s", async (_name, target) => {
    const response = await LocalFilesSetup.serve(target, ALIASES, root);
    const body = await response.text();

    expect([response.status, body]).toStrictEqual([404, "Not found"]);
  });
});
