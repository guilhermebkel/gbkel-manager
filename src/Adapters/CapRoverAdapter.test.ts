import { describe, expect, it } from "vitest";
import { CapRoverAdapter } from "#app/Adapters/CapRoverAdapter.ts";
import type { Alias } from "#app/Protocols/AliasProtocol.ts";
import type { CapRoverClientPort, CapRoverDomain } from "#app/Protocols/CapRoverProtocol.ts";

const GO_URL = "http://go.example.com/";

const ALIASES: Alias[] = [
  { from: "go.example.com", to: "https://target.test/home", statusCode: 302 },
  { from: "static.example.com/*", to: "/static/:splat", statusCode: 200, adapters: ["netlify"] },
];

const failUpstream = () => Promise.reject(new Error("upstream must not be called"));

const createAdapter = async (aliases: Alias[] = ALIASES) => {
  const adapter = new CapRoverAdapter(failUpstream);
  await adapter.sync(aliases);
  return adapter;
};

describe("CapRoverAdapter.handle()", () => {
  it("redirects a host of the file", async () => {
    const adapter = await createAdapter();

    const response = await adapter.handle(new Request(GO_URL));

    expect([response.status, response.headers.get("location")]).toStrictEqual([302, "https://target.test/home"]);
  });

  it("answers 404 for a host that is not in the file", async () => {
    const adapter = await createAdapter();

    const response = await adapter.handle(new Request("http://stranger.example.com/"));

    expect(response.status).toBe(404);
  });

  it("answers the health check on any host that no alias claims", async () => {
    const adapter = await createAdapter();

    const response = await adapter.handle(new Request("http://127.0.0.1:3000/healthz"));

    expect([response.status, await response.text()]).toStrictEqual([200, "ok"]);
  });

  it("does not serve an alias restricted to another adapter", async () => {
    const adapter = await createAdapter();

    const response = await adapter.handle(new Request("http://static.example.com/css/a.css"));

    expect(response.status).toBe(404);
  });
});

describe("CapRoverAdapter.sync()", () => {
  it("replaces the aliases it serves", async () => {
    const adapter = await createAdapter();
    await adapter.sync([{ from: "new.example.com", to: "https://n.test", statusCode: 301 }]);

    const oldHost = await adapter.handle(new Request(GO_URL));
    const newHost = await adapter.handle(new Request("http://new.example.com/"));

    expect([oldHost.status, newHost.status]).toStrictEqual([404, 301]);
  });

  it("refuses an alias with a local target that nothing restricts, keeping the old ones", async () => {
    const adapter = await createAdapter();
    const local: Alias = { from: "l.example.com", to: "/x", statusCode: 301 };

    await expect(adapter.sync([local])).rejects.toThrow("caprover cannot serve l.example.com: it needs canServeLocalTargets");
    const stillServed = await adapter.handle(new Request(GO_URL));

    expect(stillServed.status).toBe(302);
  });

  describe("when a CapRover is configured", () => {
    const APP = "redirects";
    const HOST_A = "a.example.com";
    const HOST_B = "b.example.com";
    const CHECKED: Alias[] = [
      { from: HOST_A, to: "https://a.test", statusCode: 301 },
      { from: `${HOST_B}/:id`, to: "https://b.test/:id", statusCode: 301 },
      { from: HOST_B, to: "https://b.test", statusCode: 301 },
    ];

    const createRemote = (domains: CapRoverDomain[]) => {
      const calls: string[] = [];
      const client: CapRoverClientPort = {
        listCustomDomains: () => Promise.resolve(domains),
        addCustomDomain: (_app, domain) => Promise.resolve(void calls.push(`add ${domain}`)),
        enableSsl: (_app, domain) => Promise.resolve(void calls.push(`ssl ${domain}`)),
        removeCustomDomain: (_app, domain) => Promise.resolve(void calls.push(`remove ${domain}`)),
      };
      return { calls, adapter: new CapRoverAdapter(failUpstream, { client, appName: APP }) };
    };

    it("adds each missing host once and turns SSL on for it", async () => {
      const { adapter, calls } = createRemote([{ publicDomain: HOST_A, hasSsl: true }]);

      await adapter.sync(CHECKED);

      expect(calls).toStrictEqual([`add ${HOST_B}`, `ssl ${HOST_B}`]);
    });

    it("turns SSL on for a domain the app has without it", async () => {
      const { adapter, calls } = createRemote([
        { publicDomain: HOST_A, hasSsl: false },
        { publicDomain: HOST_B, hasSsl: true },
      ]);

      await adapter.sync(CHECKED);

      expect(calls).toStrictEqual([`ssl ${HOST_A}`]);
    });

    it("removes a domain the file no longer has", async () => {
      const { adapter, calls } = createRemote([
        { publicDomain: HOST_A, hasSsl: true },
        { publicDomain: HOST_B, hasSsl: true },
        { publicDomain: "old.example.com", hasSsl: true },
      ]);

      await adapter.sync(CHECKED);

      expect(calls).toStrictEqual(["remove old.example.com"]);
    });
  });
});
