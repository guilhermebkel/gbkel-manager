import { describe, expect, it } from "vitest";
import { CloudflareApiAdapter } from "#app/Adapters/CloudflareApiAdapter.ts";
import type { CloudflareRecordInput } from "#app/Protocols/CloudflareProtocol.ts";

type Call = {
  method: string;
  url: string;
  authorization: string | null;
  body: string;
};

const TOKEN = "fake-token-abc123";
const ZONE_ID = "zone-1";
const API = "https://api.cloudflare.com/client/v4";
const HOST = "a.example.com";
const INPUT: CloudflareRecordInput = { type: "CNAME", name: HOST, content: "t.example.com", proxied: false, ttl: 1 };

const createApi = (result: unknown, status = 200, success = true, errors: { message: string }[] = []) => {
  const calls: Call[] = [];
  const fetchFake = async (request: Request) => {
    const { method, url, headers } = request;
    calls.push({ method, url, authorization: headers.get("authorization"), body: await request.text() });
    return new Response(JSON.stringify({ success, errors, result }), { status });
  };
  return { calls, api: new CloudflareApiAdapter(fetchFake, { token: TOKEN }) };
};

describe("CloudflareApiAdapter.findZoneId()", () => {
  it("looks the zone up by name with the bearer token and returns its id", async () => {
    const { api, calls } = createApi([{ id: ZONE_ID }]);

    const zoneId = await api.findZoneId("example.com");

    expect(zoneId).toBe(ZONE_ID);
    expect(calls[0]).toStrictEqual({ method: "GET", url: `${API}/zones?name=example.com`, authorization: `Bearer ${TOKEN}`, body: "" });
  });

  it("fails when the token does not see the zone", async () => {
    const { api } = createApi([]);

    await expect(api.findZoneId("example.com")).rejects.toThrow("The Cloudflare zone \"example.com\" was not found for this token");
  });
});

describe("CloudflareApiAdapter.listRecords()", () => {
  it("lists the records of a name keeping only the fields it uses", async () => {
    const raw = { id: "r1", type: "CNAME", name: HOST, content: "t", proxied: true, ttl: 1, zone_id: ZONE_ID };
    const { api, calls } = createApi([raw]);

    const records = await api.listRecords(ZONE_ID, HOST);

    expect(records).toStrictEqual([{ id: "r1", type: "CNAME", name: HOST, content: "t", proxied: true }]);
    expect(calls[0]?.url).toBe(`${API}/zones/${ZONE_ID}/dns_records?name=a.example.com`);
  });
});

describe("CloudflareApiAdapter.createRecord()", () => {
  it("posts the record to the zone", async () => {
    const { api, calls } = createApi({});

    await api.createRecord(ZONE_ID, INPUT);

    expect([calls[0]?.method, calls[0]?.url, calls[0]?.body]).toStrictEqual(["POST", `${API}/zones/${ZONE_ID}/dns_records`, JSON.stringify(INPUT)]);
  });

  it("fails with the reasons Cloudflare gave, never with the token", async () => {
    const { api } = createApi(null, 400, false, [{ message: "Record already exists" }]);

    const failure = await api.createRecord(ZONE_ID, INPUT).catch((error: unknown) => String(error));

    expect(failure).toBe(`Error: Cloudflare refused POST /zones/${ZONE_ID}/dns_records: Record already exists`);
    expect(failure).not.toContain(TOKEN);
  });
});

describe("CloudflareApiAdapter.updateRecord()", () => {
  it("puts the record by id", async () => {
    const { api, calls } = createApi({});

    await api.updateRecord(ZONE_ID, "r1", INPUT);

    expect([calls[0]?.method, calls[0]?.url]).toStrictEqual(["PUT", `${API}/zones/${ZONE_ID}/dns_records/r1`]);
  });
});
