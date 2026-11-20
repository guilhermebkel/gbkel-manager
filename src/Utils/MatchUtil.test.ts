import { describe, expect, it } from "vitest";
import type { Alias } from "#app/Protocols/AliasProtocol.ts";
import { MatchUtil } from "#app/Utils/MatchUtil.ts";

const LINKEDIN_HOST = "linkedin.example.com";
const NOTION_HOST = "notion.example.com";
const BLOG_HOST = "blog.example.com";
const SEO_HOST = "seo.example.com";
const LINKEDIN_URL = "https://linkedin.com/in/someone";
const LIGHTHOUSE_URL = "https://lighthouse.test/?psiurl=https%3A%2F%2F";

const ALIASES: Alias[] = [
  { from: LINKEDIN_HOST, to: LINKEDIN_URL, statusCode: 301 },
  { from: `${SEO_HOST}/:url/:device`, to: `${LIGHTHOUSE_URL}:url&strategy=:device`, statusCode: 301 },
  { from: BLOG_HOST, to: "https://example.com/blog", statusCode: 301 },
  { from: `${BLOG_HOST}/*`, to: "https://example.com/:splat", statusCode: 200 },
  { from: `${NOTION_HOST}/:pageId`, to: "https://notion.test/me/:pageId", statusCode: 301 },
];

const resolve = (host: string, path: string, search = "") => {
  return MatchUtil.resolve(ALIASES, { host, path, search });
};

describe("MatchUtil.resolve()", () => {
  describe("when the alias has only a host", () => {
    it("redirects the root path to the target with the alias status code", () => {
      const resolution = resolve(LINKEDIN_HOST, "/");

      expect(resolution).toStrictEqual({
        alias: ALIASES[0],
        location: LINKEDIN_URL,
        mode: "redirect",
        statusCode: 301,
      });
    });

    it("does not match a deeper path", () => {
      const resolution = resolve(LINKEDIN_HOST, "/anything");

      expect(resolution).toBeNull();
    });
  });

  describe("when the alias has path parameters", () => {
    it("puts every captured segment into the target", () => {
      const resolution = resolve(SEO_HOST, "/example.org/mobile");

      expect(resolution?.location).toBe(`${LIGHTHOUSE_URL}example.org&strategy=mobile`);
    });

    it("does not match when a segment is missing", () => {
      const resolution = resolve(SEO_HOST, "/example.org");

      expect(resolution).toBeNull();
    });

    it("does not match when there is a segment left over", () => {
      const resolution = resolve(NOTION_HOST, "/page/extra");

      expect(resolution).toBeNull();
    });
  });

  describe("when the alias has a splat", () => {
    it("keeps the rest of the path, including slashes, and marks the alias as a proxy", () => {
      const resolution = resolve(BLOG_HOST, "/2022/05/post");

      expect(resolution).toStrictEqual({
        alias: ALIASES[3],
        location: "https://example.com/2022/05/post",
        mode: "proxy",
        statusCode: 200,
      });
    });

    it("matches an empty rest of the path through the first alias that matches", () => {
      const resolution = resolve(BLOG_HOST, "/");

      expect(resolution?.alias).toBe(ALIASES[2]);
    });
  });

  describe("when the request carries more than the path", () => {
    it("matches the host ignoring case and port", () => {
      const resolution = resolve("LinkedIn.Example.com:8080", "/");

      expect(resolution?.alias).toBe(ALIASES[0]);
    });

    it("ignores a trailing slash in the path", () => {
      const resolution = resolve(NOTION_HOST, "/abc/");

      expect(resolution?.location).toBe("https://notion.test/me/abc");
    });

    it("keeps the query string of the request on the target", () => {
      const resolution = resolve(LINKEDIN_HOST, "/", "?ref=mail");

      expect(resolution?.location).toBe(`${LINKEDIN_URL}?ref=mail`);
    });

    it("joins the query string with the one the target already has", () => {
      const resolution = resolve(SEO_HOST, "/a.org/mobile", "?x=1");

      expect(resolution?.location).toBe(`${LIGHTHOUSE_URL}a.org&strategy=mobile&x=1`);
    });
  });

  describe("when no alias matches", () => {
    it("returns nothing for an unknown host", () => {
      const resolution = resolve("other.example.com", "/");

      expect(resolution).toBeNull();
    });
  });
});
