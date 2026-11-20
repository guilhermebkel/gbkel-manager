import { describe, expect, it } from "vitest";
import { NetlifyAdapter } from "#app/Adapters/NetlifyAdapter.ts";
import type { Alias } from "#app/Protocols/AliasProtocol.ts";
import type { NetlifyClientPort, UpdateSiteParams } from "#app/Protocols/NetlifyProtocol.ts";

const ALIASES: Alias[] = [
  { from: "linkedin.example.com", to: "https://linkedin.com/in/someone", statusCode: 301 },
  { from: "seo.example.com/:url/:device", to: "https://lighthouse.test/?u=:url&d=:device", statusCode: 301 },
  { from: "blog.example.com/*", to: "https://example.com/:splat", statusCode: 200 },
  { from: "blog.example.com", to: "https://example.com/blog", statusCode: 301 },
  { from: "docker-only.example.com", to: "https://x.test", statusCode: 301, adapters: ["docker"] },
];

const EXPECTED_REDIRECTS = [
  "http://linkedin.example.com https://linkedin.com/in/someone 301!",
  "https://linkedin.example.com https://linkedin.com/in/someone 301!",
  "",
  "http://seo.example.com/:url/:device https://lighthouse.test/?u=:url&d=:device 301!",
  "https://seo.example.com/:url/:device https://lighthouse.test/?u=:url&d=:device 301!",
  "",
  "http://blog.example.com/* https://example.com/:splat 200!",
  "https://blog.example.com/* https://example.com/:splat 200!",
  "",
  "http://blog.example.com https://example.com/blog 301!",
  "https://blog.example.com https://example.com/blog 301!",
].join("\n");

type SiteUpdate = UpdateSiteParams;

const createFakeClient = () => {
  const updates: SiteUpdate[] = [];
  const client: NetlifyClientPort = {
    updateSite: (params) => {
      updates.push(params);
      return Promise.resolve();
    },
  };
  return { client, updates };
};

const createAdapter = () => {
  const { client, updates } = createFakeClient();
  const pathToContent = new Map<string, string>();
  const writeFile = (path: string, content: string) => {
    pathToContent.set(path, content);
    return Promise.resolve();
  };
  const adapter = new NetlifyAdapter(client, { siteId: "site-1", redirectsFilePath: "/out/_redirects" }, writeFile);
  return { adapter, pathToContent, updates };
};

describe("NetlifyAdapter.buildRedirectsFile()", () => {
  it("writes an http and an https rule per alias, forced, separated by a blank line", () => {
    const content = NetlifyAdapter.buildRedirectsFile(ALIASES.slice(0, 4));

    expect(content).toBe(EXPECTED_REDIRECTS);
  });
});

describe("NetlifyAdapter.sync()", () => {
  it("sends each host once to Netlify as a domain alias", async () => {
    const { adapter, updates } = createAdapter();

    await adapter.sync(ALIASES);

    expect(updates).toStrictEqual([
      { site_id: "site-1", body: { domain_aliases: ["linkedin.example.com", "seo.example.com", "blog.example.com"] } },
    ]);
  });

  it("writes the redirects file without the aliases restricted to other adapters", async () => {
    const { adapter, pathToContent } = createAdapter();

    await adapter.sync(ALIASES);

    expect(pathToContent.get("/out/_redirects")).toBe(EXPECTED_REDIRECTS);
  });
});
