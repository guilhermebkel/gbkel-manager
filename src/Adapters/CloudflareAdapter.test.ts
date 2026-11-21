import { describe, expect, it } from "vitest";
import { CloudflareAdapter } from "#app/Adapters/CloudflareAdapter.ts";
import type { Alias } from "#app/Protocols/AliasProtocol.ts";
import type { CloudflareClientPort, CloudflareRecord } from "#app/Protocols/CloudflareProtocol.ts";

const ZONE = "example.com";
const ZONE_ID = "zone-1";
const TARGET = "captain.example.com";
const HOST_A = "a.example.com";
const HOST_B = "b.example.com";

const CLAIMED_A: Alias = { from: HOST_A, to: "https://a.test", statusCode: 301, adapters: ["caprover"] };
const CLAIMED_B: Alias = { from: `${HOST_B}/:id`, to: "https://b.test/:id", statusCode: 301, adapters: ["netlify", "caprover"] };
const UNCLAIMED: Alias = { from: "netlify-only.example.com", to: "https://n.test", statusCode: 301 };

const record = (name: string, overrides: Partial<CloudflareRecord> = {}): CloudflareRecord => {
  return { id: `id-${name}`, type: "CNAME", name, content: TARGET, proxied: false, ...overrides };
};

const createAdapter = (existing: CloudflareRecord[]) => {
  const calls: string[] = [];
  const client: CloudflareClientPort = {
    findZoneId: (zoneName) => {
      calls.push(`zone ${zoneName}`);
      return Promise.resolve(ZONE_ID);
    },
    listRecords: (_zone, name) => Promise.resolve(existing.filter((item) => item.name === name)),
    createRecord: (_zone, input) => Promise.resolve(void calls.push(`create ${input.name} ${input.content} ${input.proxied}`)),
    updateRecord: (_zone, id, input) => Promise.resolve(void calls.push(`update ${id} ${input.content} ${input.proxied}`)),
  };
  return { calls, adapter: new CloudflareAdapter(client, { zoneName: ZONE, target: TARGET }) };
};

describe("CloudflareAdapter.sync()", () => {
  it("creates a CNAME to the target, without the Cloudflare proxy, for each host CapRover claims", async () => {
    const { adapter, calls } = createAdapter([]);

    await adapter.sync([CLAIMED_A, CLAIMED_B, UNCLAIMED]);

    expect(calls).toStrictEqual([
      `zone ${ZONE}`,
      `create ${HOST_A} ${TARGET} false`,
      `create ${HOST_B} ${TARGET} false`,
    ]);
  });

  it("touches nothing when no alias names caprover, not even the zone", async () => {
    const { adapter, calls } = createAdapter([]);

    await adapter.sync([UNCLAIMED]);

    expect(calls).toStrictEqual([]);
  });

  it("leaves a record that already points to the target alone", async () => {
    const { adapter, calls } = createAdapter([record(HOST_A)]);

    await adapter.sync([CLAIMED_A]);

    expect(calls).toStrictEqual([`zone ${ZONE}`]);
  });

  it("repoints a CNAME that goes elsewhere, such as the old Netlify one", async () => {
    const { adapter, calls } = createAdapter([record(HOST_A, { content: "old.netlify.app" })]);

    await adapter.sync([CLAIMED_A]);

    expect(calls).toStrictEqual([`zone ${ZONE}`, `update id-${HOST_A} ${TARGET} false`]);
  });

  it("turns the proxy off on a record that had it on", async () => {
    const { adapter, calls } = createAdapter([record(HOST_A, { proxied: true })]);

    await adapter.sync([CLAIMED_A]);

    expect(calls).toStrictEqual([`zone ${ZONE}`, `update id-${HOST_A} ${TARGET} false`]);
  });

  it("refuses to replace a record that is not a CNAME, naming the host", async () => {
    const { adapter, calls } = createAdapter([record(HOST_A, { type: "A", content: "1.2.3.4" })]);

    await expect(adapter.sync([CLAIMED_A])).rejects.toThrow("a.example.com already has a A record");
    expect(calls).toStrictEqual([`zone ${ZONE}`]);
  });

  it("fails before any change when a host is outside the zone", async () => {
    const outside: Alias = { from: "x.other.org", to: "https://x.test", statusCode: 301, adapters: ["caprover"] };
    const { adapter, calls } = createAdapter([]);

    await expect(adapter.sync([CLAIMED_A, outside])).rejects.toThrow("x.other.org is not in the Cloudflare zone example.com");
    expect(calls).toStrictEqual([]);
  });

  it("does not take a host that only ends with the zone name for one of its subdomains", async () => {
    const lookalike: Alias = { from: "evilexample.com", to: "https://x.test", statusCode: 301, adapters: ["caprover"] };
    const { adapter } = createAdapter([]);

    await expect(adapter.sync([lookalike])).rejects.toThrow("evilexample.com is not in the Cloudflare zone");
  });
});
