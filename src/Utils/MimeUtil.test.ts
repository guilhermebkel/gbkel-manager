import { describe, expect, it } from "vitest";
import { MimeUtil } from "#app/Utils/MimeUtil.ts";

describe("MimeUtil.getContentType()", () => {
  it.each([
    ["static/css/font.css", "text/css; charset=utf-8"],
    ["static/js/default.js", "text/javascript; charset=utf-8"],
    ["static/image/logo/logo-1-black.png", "image/png"],
    ["pages/mail.HTML", "text/html; charset=utf-8"],
    ["static/unknown.xyz", "application/octet-stream"],
    ["static/noextension", "application/octet-stream"],
  ])("types %s as %s", (path, type) => {
    expect(MimeUtil.getContentType(path)).toBe(type);
  });
});
