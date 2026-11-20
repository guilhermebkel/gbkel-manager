import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { InvalidAliasError } from "#app/Errors/InvalidAliasError.ts";
import { AliasSchema } from "#app/Schemas/AliasSchema.ts";

const VALID = { from: "a.example.com", to: "https://b.test", statusCode: 301 };
const wrap = (...aliases: unknown[]) => ({ domainAliases: aliases });

describe("AliasSchema.parse()", () => {
  describe("when the file is valid", () => {
    it("returns the aliases as they are written", () => {
      const file = wrap(VALID);

      expect(AliasSchema.parse(file)).toStrictEqual([VALID]);
    });

    it("keeps the adapters an alias is restricted to", () => {
      const alias = { ...VALID, adapters: ["netlify"] };
      const file = wrap(alias);

      expect(AliasSchema.parse(file)).toStrictEqual([alias]);
    });

    it("accepts the real domainAliases.json of this repository", () => {
      const raw: unknown = JSON.parse(readFileSync("domainAliases.json", "utf8"));

      expect(AliasSchema.parse(raw).length).toBeGreaterThan(0);
    });
  });

  describe("when the file is invalid", () => {
    it.each([
      ["a file with no list", {}, "must be an object with a \"domainAliases\" array"],
      ["an alias that is not an object", wrap("a.example.com"), "every alias must be an object"],
      ["a from that is not a host", wrap({ ...VALID, from: "localhost" }), "localhost: \"from\" must start with a host"],
      ["a splat that is not last", wrap({ ...VALID, from: "a.example.com/*/x" }), "\"*\" is allowed only as the last"],
      ["a target that is not a URL", wrap({ ...VALID, to: "ftp://x" }), "a.example.com: \"to\" must be an http(s) URL"],
      ["a target parameter that from lacks", wrap({ ...VALID, to: "https://b.test/:id" }), "uses :id, which \"from\" does not define"],
      ["a status code that is neither", wrap({ ...VALID, statusCode: 404 }), "\"statusCode\" must be 200 (proxy) or 301"],
      ["an unknown adapter", wrap({ ...VALID, adapters: ["vercel"] }), "\"adapters\" must be a non-empty list of: netlify"],
      ["a duplicated from", wrap(VALID, { ...VALID, from: "A.example.com" }), "duplicated \"from\""],
    ])("rejects %s", (_name, raw, message) => {
      expect(() => AliasSchema.parse(raw)).toThrow(InvalidAliasError);
      expect(() => AliasSchema.parse(raw)).toThrow(message);
    });
  });
});
