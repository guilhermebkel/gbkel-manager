import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { CapRoverAdapter } from "#app/Adapters/CapRoverAdapter.ts";
import type { RuntimeAdapterPort } from "#app/Protocols/AdapterProtocol.ts";
import type { Alias } from "#app/Protocols/AliasProtocol.ts";
import type { ServerSettings, RunningServer } from "#app/Protocols/ServerProtocol.ts";
import { AliasSourceSetup } from "#app/Setup/AliasSourceSetup.ts";
import { EnvSetup } from "#app/Setup/EnvSetup.ts";
import { AliasUtil } from "#app/Utils/AliasUtil.ts";

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_RELOAD_SECONDS = 300;
const MS_PER_SECOND = 1000;
const BAD_REQUEST = 400;
const BAD_GATEWAY = 502;
const BODYLESS_METHODS = ["GET", "HEAD"];

export class ServerSetup {
  static readSettings(): ServerSettings {
    const reloadSeconds = Number(EnvSetup.read("ALIASES_RELOAD_SECONDS") ?? DEFAULT_RELOAD_SECONDS);
    const aliasesUrl = EnvSetup.read("ALIASES_URL");
    return {
      host: EnvSetup.read("HOST") ?? DEFAULT_HOST,
      port: Number(EnvSetup.read("PORT") ?? DEFAULT_PORT),
      aliasesFile: EnvSetup.read("ALIASES_FILE") ?? "domainAliases.json",
      reloadIntervalMs: reloadSeconds * MS_PER_SECOND,
      ...(aliasesUrl === undefined ? {} : { aliasesUrl }),
    };
  }

  static buildWebRequest(incoming: IncomingMessage): Request {
    const host = incoming.headers.host ?? "localhost";
    const method = incoming.method ?? "GET";
    const headers = new Headers();
    for (const [name, value] of Object.entries(incoming.headers)) {
      headers.set(name, Array.isArray(value) ? value.join(", ") : (value ?? ""));
    }
    const hasBody = !BODYLESS_METHODS.includes(method);
    const init: RequestInit & { duplex: "half" } = {
      headers,
      method,
      body: hasBody ? (Readable.toWeb(incoming) as ReadableStream) : null,
      duplex: "half",
    };
    return new Request(`http://${host}${incoming.url ?? "/"}`, init);
  }

  static async sendWebResponse(response: Response, outgoing: ServerResponse): Promise<void> {
    outgoing.statusCode = response.status;
    for (const [name, value] of response.headers) {
      if (name === "set-cookie") {
        continue;
      }
      outgoing.setHeader(name, value);
    }
    const cookies = response.headers.getSetCookie();
    if (cookies.length > 0) {
      outgoing.setHeader("set-cookie", cookies);
    }
    if (response.body === null) {
      outgoing.end();
      return;
    }
    await new Promise<void>((resolve, reject) => {
      Readable.fromWeb(response.body as never).on("error", reject).on("end", resolve).pipe(outgoing);
    });
  }

  static async handleRequest(
    adapter: RuntimeAdapterPort,
    incoming: IncomingMessage,
    outgoing: ServerResponse,
  ): Promise<void> {
    try {
      const request = ServerSetup.buildWebRequest(incoming);
      await ServerSetup.sendWebResponse(await adapter.handle(request), outgoing);
    } catch (error) {
      const isBadRequest = error instanceof TypeError && error.message.includes("Invalid URL");
      console.error("request failed:", error instanceof Error ? error.message : "unknown error");
      if (!outgoing.headersSent) {
        outgoing.writeHead(isBadRequest ? BAD_REQUEST : BAD_GATEWAY).end();
      } else {
        outgoing.destroy();
      }
    }
  }

  static async start(aliases: Alias[], settings: Pick<ServerSettings, "host" | "port">): Promise<RunningServer> {
    const adapter = new CapRoverAdapter((request) => fetch(request));
    await adapter.sync(aliases);
    const server = createServer((incoming, outgoing) => {
      void ServerSetup.handleRequest(adapter, incoming, outgoing);
    });
    await new Promise<void>((resolve) => {
      server.listen(settings.port, settings.host, resolve);
    });
    const address = server.address();
    const port = typeof address === "object" && address !== null ? address.port : settings.port;
    const stop = () => new Promise<void>((resolve) => {
      server.close(() => {
        resolve();
      });
      server.closeAllConnections();
    });
    ServerSetup.startReload(adapter);
    return { port, stop };
  }

  static startReload(adapter: RuntimeAdapterPort): void {
    const settings = ServerSetup.readSettings();
    if (settings.reloadIntervalMs <= 0 || settings.aliasesUrl === undefined) {
      return;
    }
    const timer = setInterval(() => {
      AliasSourceSetup.load(settings.aliasesFile, settings.aliasesUrl)
        .then((aliases) => adapter.sync(aliases))
        .catch((error: unknown) => {
          console.error("alias reload failed, keeping the previous ones:", error instanceof Error ? error.message : "unknown error");
        });
    }, settings.reloadIntervalMs);
    timer.unref();
  }

  static async run(): Promise<void> {
    EnvSetup.load();
    const settings = ServerSetup.readSettings();
    const aliases = await AliasSourceSetup.load(settings.aliasesFile, settings.aliasesUrl);
    const running = await ServerSetup.start(aliases, settings);
    const served = AliasUtil.selectFor(aliases, "caprover");
    console.log(`caprover: serving ${served.length} of ${aliases.length} aliases on ${settings.host}:${running.port}`);
    process.on("SIGTERM", () => {
      void running.stop().then(() => process.exit(0));
    });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await ServerSetup.run();
}
