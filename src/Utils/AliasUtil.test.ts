import { describe, expect, it } from "vitest";
import type { AdapterCapabilities } from "#app/Protocols/AdapterProtocol.ts";
import type { Alias } from "#app/Protocols/AliasProtocol.ts";
import { AliasUtil } from "#app/Utils/AliasUtil.ts";

const REDIRECT: Alias = { from: "A.example.com", to: "https://b.test", statusCode: 301 };
const PROXY: Alias = { from: "p.example.com/*", to: "https://b.test/:splat", statusCode: 200 };
const LOCAL: Alias = { from: "s.example.com/*", to: "/static/:splat", statusCode: 200, adapters: ["netlify"] };
const NOTHING: AdapterCapabilities = { canProxy: false, canMatchPathParams: false, canServeLocalTargets: false };
const EVERYTHING: AdapterCapabilities = { canProxy: true, canMatchPathParams: true, canServeLocalTargets: true };

describe("AliasUtil.getMode()", () => {
  it("is proxy for 200 and redirect for a redirect code", () => {
    expect([AliasUtil.getMode(PROXY), AliasUtil.getMode(REDIRECT)]).toStrictEqual(["proxy", "redirect"]);
  });
});

describe("AliasUtil.getHost()", () => {
  it("lowercases the host and drops the path", () => {
    expect([AliasUtil.getHost(REDIRECT), AliasUtil.getHost(PROXY)]).toStrictEqual(["a.example.com", "p.example.com"]);
  });
});

describe("AliasUtil.getPathPattern()", () => {
  it("is the root when there is no path and the path otherwise", () => {
    expect([AliasUtil.getPathPattern(REDIRECT), AliasUtil.getPathPattern(PROXY)]).toStrictEqual(["/", "/*"]);
  });
});

describe("AliasUtil.selectFor()", () => {
  it("keeps the aliases with no restriction and the ones that name the adapter", () => {
    expect(AliasUtil.selectFor([REDIRECT, LOCAL], "caprover")).toStrictEqual([REDIRECT]);
    expect(AliasUtil.selectFor([REDIRECT, LOCAL], "netlify")).toStrictEqual([REDIRECT, LOCAL]);
  });
});

describe("AliasUtil.selectClaimedBy()", () => {
  it("keeps only the aliases that name the adapter, not the ones open to every adapter", () => {
    const claimed: Alias = { ...REDIRECT, adapters: ["caprover"] };

    expect(AliasUtil.selectClaimedBy([REDIRECT, claimed, LOCAL], "caprover")).toStrictEqual([claimed]);
  });
});

describe("AliasUtil.findMissingCapability()", () => {
  it("finds nothing missing for a plain redirect on any adapter", () => {
    expect(AliasUtil.findMissingCapability(REDIRECT, NOTHING)).toBeNull();
  });

  it.each([
    [PROXY, "canProxy"],
    [{ ...PROXY, statusCode: 301 }, "canMatchPathParams"],
    [LOCAL, "canProxy"],
    [{ ...LOCAL, statusCode: 301, from: "s.example.com" }, "canServeLocalTargets"],
  ] satisfies [Alias, keyof AdapterCapabilities][])("names the first capability %j needs: %s", (alias, capability) => {
    expect(AliasUtil.findMissingCapability(alias, NOTHING)).toBe(capability);
  });

  it("finds nothing missing when the adapter can do everything", () => {
    expect(AliasUtil.findMissingCapability(LOCAL, EVERYTHING)).toBeNull();
  });
});
