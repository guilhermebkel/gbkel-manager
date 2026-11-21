import { describe, expect, it } from "vitest";
import { UnsupportedAliasError } from "#app/Errors/UnsupportedAliasError.ts";
import type { AdapterCapabilities } from "#app/Protocols/AdapterProtocol.ts";
import type { Alias } from "#app/Protocols/AliasProtocol.ts";
import { CapabilityUtil } from "#app/Utils/CapabilityUtil.ts";

const REDIRECT_ONLY: AdapterCapabilities = { canProxy: false, canMatchPathParams: true, canServeLocalTargets: false };
const REDIRECT: Alias = { from: "a.example.com", to: "https://b.test", statusCode: 301 };
const PROXY: Alias = { from: "p.example.com/*", to: "https://b.test/:splat", statusCode: 200 };
const LOCAL: Alias = { from: "s.example.com/*", to: "/static/:splat", statusCode: 200, adapters: ["netlify"] };

describe("CapabilityUtil.assertServable()", () => {
  it("returns the aliases the adapter serves", () => {
    const served = CapabilityUtil.assertServable("caprover", { ...REDIRECT_ONLY, canProxy: true }, [REDIRECT, PROXY, LOCAL]);

    expect(served).toStrictEqual([REDIRECT, PROXY]);
  });

  it("fails naming the alias and the capability when the adapter lacks one", () => {
    const runAssertion = () => CapabilityUtil.assertServable("netlify", REDIRECT_ONLY, [REDIRECT, PROXY]);

    expect(runAssertion).toThrow(UnsupportedAliasError);
    expect(runAssertion).toThrow("netlify cannot serve p.example.com/*: it needs canProxy");
  });

  it("does not look at an alias restricted to another adapter", () => {
    const served = CapabilityUtil.assertServable("caprover", REDIRECT_ONLY, [REDIRECT, LOCAL]);

    expect(served).toStrictEqual([REDIRECT]);
  });
});
