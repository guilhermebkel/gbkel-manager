import { describe, expect, it } from "vitest";
import type { Alias } from "#app/Protocols/AliasProtocol.ts";
import { ServeUtil } from "#app/Utils/ServeUtil.ts";

const BLOG_URL = "https://blog.example.com/x";

const ALIASES: Alias[] = [
  { from: "go.example.com", to: "https://target.test/home", statusCode: 301 },
  { from: "blog.example.com/*", to: "https://origin.test/blog/:splat", statusCode: 200 },
  { from: "s.example.com/*", to: "/static/:splat", statusCode: 200 },
];

const createUpstream = (response: Response) => {
  const seen: Request[] = [];
  const fetchUpstream = (request: Request) => {
    seen.push(request);
    return Promise.resolve(response);
  };
  return { fetchUpstream, seen };
};

describe("ServeUtil.serve()", () => {
  describe("when the alias redirects", () => {
    it("answers with the alias status code and the location, without calling upstream", async () => {
      const { fetchUpstream, seen } = createUpstream(new Response("never"));

      const response = await ServeUtil.serve(ALIASES, new Request("https://go.example.com/?a=1"), { fetchUpstream });

      expect(response?.status).toBe(301);
      expect(response?.headers.get("location")).toBe("https://target.test/home?a=1");
      expect(seen).toStrictEqual([]);
    });
  });

  describe("when the alias is a proxy", () => {
    it("fetches the resolved location with the same method and returns the upstream body", async () => {
      const upstream = new Response("<p>post</p>", { status: 200, headers: { "content-type": "text/html" } });
      const { fetchUpstream, seen } = createUpstream(upstream);

      const response = await ServeUtil.serve(ALIASES, new Request("https://blog.example.com/2022/post"), { fetchUpstream });

      expect(await response?.text()).toBe("<p>post</p>");
      expect(response?.headers.get("content-type")).toBe("text/html");
      expect([seen[0]?.url, seen[0]?.method]).toStrictEqual(["https://origin.test/blog/2022/post", "GET"]);
    });

    it("tells upstream the original host and drops the Host header and hop-by-hop headers", async () => {
      const { fetchUpstream, seen } = createUpstream(new Response("ok"));
      const request = new Request(BLOG_URL, { headers: { "connection": "keep-alive", "x-keep": "1" } });

      await ServeUtil.serve(ALIASES, request, { fetchUpstream });

      expect(seen[0]?.headers.get("x-forwarded-host")).toBe("blog.example.com");
      expect(seen[0]?.headers.get("connection")).toBeNull();
      expect(seen[0]?.headers.get("x-keep")).toBe("1");
    });

    it("drops the headers that describe an encoding fetch already decoded", async () => {
      const upstream = new Response("ok", { headers: { "content-encoding": "gzip", "content-length": "99", "x-origin": "yes" } });
      const { fetchUpstream } = createUpstream(upstream);

      const response = await ServeUtil.serve(ALIASES, new Request(BLOG_URL), { fetchUpstream });

      expect(response?.headers.get("content-encoding")).toBeNull();
      expect(response?.headers.get("content-length")).toBeNull();
      expect(response?.headers.get("x-origin")).toBe("yes");
    });

    it("does not follow a redirect of upstream: the visitor does", async () => {
      const upstream = new Response(null, { status: 302, headers: { location: "https://elsewhere.test/" } });
      const { fetchUpstream, seen } = createUpstream(upstream);

      const response = await ServeUtil.serve(ALIASES, new Request(BLOG_URL), { fetchUpstream });

      expect([response?.status, seen[0]?.redirect]).toStrictEqual([302, "manual"]);
    });

    it("sends the body of a POST", async () => {
      const { fetchUpstream, seen } = createUpstream(new Response("ok"));
      const request = new Request(BLOG_URL, { method: "POST", body: "payload" });

      await ServeUtil.serve(ALIASES, request, { fetchUpstream });

      expect(await seen[0]?.text()).toBe("payload");
    });
  });

  describe("when the alias points to a local path", () => {
    it("asks the runtime to serve it", async () => {
      const { fetchUpstream } = createUpstream(new Response("never"));
      const serveLocal = (path: string) => Promise.resolve(new Response(`local:${path}`));

      const response = await ServeUtil.serve(ALIASES, new Request("https://s.example.com/css/a.css"), { fetchUpstream, serveLocal });

      expect(await response?.text()).toBe("local:/static/css/a.css");
    });

    it("fails when the runtime cannot serve local paths", async () => {
      const { fetchUpstream } = createUpstream(new Response("never"));

      const serving = ServeUtil.serve(ALIASES, new Request("https://s.example.com/a.css"), { fetchUpstream });

      await expect(serving).rejects.toThrow("s.example.com/* points to a local path");
    });
  });

  describe("when no alias matches", () => {
    it("returns nothing", async () => {
      const { fetchUpstream } = createUpstream(new Response("never"));

      const response = await ServeUtil.serve(ALIASES, new Request("https://unknown.example.com/"), { fetchUpstream });

      expect(response).toBeNull();
    });
  });
});
