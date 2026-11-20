import { createServer, request } from "node:http";
import type { IncomingHttpHeaders, Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import type { Alias } from "#app/Protocols/AliasProtocol.ts";
import type { RunningServer } from "#app/Protocols/ServerProtocol.ts";
import { ServerSetup } from "#app/Setup/ServerSetup.ts";

type RawResponse = {
  status: number;
  headers: IncomingHttpHeaders;
  body: string;
};

const LOCAL_HOST = "127.0.0.1";
const closers: (() => Promise<void>)[] = [];

const listen = async (server: Server): Promise<number> => {
  await new Promise<void>((resolve) => {
    server.listen(0, LOCAL_HOST, resolve);
  });
  closers.push(() => new Promise<void>((resolve) => {
    server.close(() => {
      resolve();
    });
    server.closeAllConnections();
  }));
  const address = server.address();
  return typeof address === "object" && address !== null ? address.port : 0;
};

const startOrigin = (): Promise<number> => {
  const origin = createServer((incoming, outgoing) => {
    const chunks: Buffer[] = [];
    incoming.on("data", (chunk: Buffer) => chunks.push(chunk));
    incoming.on("end", () => {
      outgoing.setHeader("set-cookie", ["a=1", "b=2"]);
      outgoing.setHeader("x-seen-host", String(incoming.headers["x-forwarded-host"]));
      outgoing.end(`${incoming.method} ${incoming.url} ${Buffer.concat(chunks).toString()}`);
    });
  });
  return listen(origin);
};

const startServer = async (aliases: Alias[]): Promise<RunningServer> => {
  const running = await ServerSetup.start(aliases, { host: LOCAL_HOST, port: 0 });
  closers.push(running.stop);
  return running;
};

const send = (port: number, host: string, path: string, method = "GET", body?: string): Promise<RawResponse> => {
  return new Promise((resolve, reject) => {
    const options = { port, path, method, host: LOCAL_HOST, headers: { Host: host } };
    const outgoing = request(options, (incoming) => {
      const chunks: Buffer[] = [];
      incoming.on("data", (chunk: Buffer) => chunks.push(chunk));
      incoming.on("end", () => {
        const { headers } = incoming;
        resolve({ headers, status: incoming.statusCode ?? 0, body: Buffer.concat(chunks).toString() });
      });
    });
    outgoing.on("error", reject);
    outgoing.end(body);
  });
};

afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()));
});

describe("ServerSetup.start()", () => {
  it("redirects with the alias status code and the location", async () => {
    const running = await startServer([{ from: "go.example.com/:id", to: "https://t.test/:id", statusCode: 301 }]);

    const response = await send(running.port, "go.example.com", "/42?x=1");

    expect([response.status, response.headers.location]).toStrictEqual([301, "https://t.test/42?x=1"]);
  });

  it("proxies to the origin keeping the method, the path and the body", async () => {
    const originPort = await startOrigin();
    const target = `http://${LOCAL_HOST}:${originPort}/blog/:splat`;
    const running = await startServer([{ from: "blog.example.com/*", to: target, statusCode: 200 }]);

    const response = await send(running.port, "blog.example.com", "/2022/post?q=1", "POST", "hello");

    expect(response.status).toBe(200);
    expect(response.body).toBe("POST /blog/2022/post?q=1 hello");
    expect(response.headers["x-seen-host"]).toBe("blog.example.com");
  });

  it("passes every cookie of the origin to the visitor", async () => {
    const originPort = await startOrigin();
    const target = `http://${LOCAL_HOST}:${originPort}/:splat`;
    const running = await startServer([{ from: "p.example.com/*", to: target, statusCode: 200 }]);

    const response = await send(running.port, "p.example.com", "/x");

    expect(response.headers["set-cookie"]).toStrictEqual(["a=1", "b=2"]);
  });

  it("answers 502 when the origin is down, without leaking where it was", async () => {
    const deadPort = await startOrigin();
    await closers.pop()?.();
    const running = await startServer([{ from: "d.example.com/*", to: `http://${LOCAL_HOST}:${deadPort}/:splat`, statusCode: 200 }]);

    const response = await send(running.port, "d.example.com", "/x");

    expect([response.status, response.body]).toStrictEqual([502, ""]);
  });

  it("answers 404 for an unknown host and 200 for the health check", async () => {
    const running = await startServer([{ from: "a.example.com", to: "https://t.test", statusCode: 301 }]);

    const unknown = await send(running.port, "other.example.com", "/");
    const health = await send(running.port, `${LOCAL_HOST}:${running.port}`, "/healthz");

    expect([unknown.status, health.status]).toStrictEqual([404, 200]);
  });
});
