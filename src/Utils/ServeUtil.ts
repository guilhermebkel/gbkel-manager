import type { Alias, Resolution } from "#app/Protocols/AliasProtocol.ts";
import type { ServeServices } from "#app/Protocols/ServeProtocol.ts";
import { MatchUtil } from "#app/Utils/MatchUtil.ts";
import { ProxyUtil } from "#app/Utils/ProxyUtil.ts";

const LOCAL_PREFIX = "/";

export class ServeUtil {
  static async serve(aliases: Alias[], request: Request, services: ServeServices): Promise<Response | null> {
    const url = new URL(request.url);
    const resolution = MatchUtil.resolve(aliases, { host: url.host, path: url.pathname, search: url.search });
    if (resolution === null) {
      return null;
    }
    if (resolution.mode === "redirect") {
      return new Response(null, { status: resolution.statusCode, headers: { location: resolution.location } });
    }
    return ServeUtil.serveRewrite(resolution, request, services);
  }

  static async serveRewrite(resolution: Resolution, request: Request, services: ServeServices): Promise<Response> {
    if (!resolution.location.startsWith(LOCAL_PREFIX)) {
      const upstream = await services.fetchUpstream(ProxyUtil.buildUpstreamRequest(request, resolution.location));
      return ProxyUtil.buildProxyResponse(upstream);
    }
    if (services.serveLocal === undefined) {
      throw new Error(`${resolution.alias.from} points to a local path, which this runtime cannot serve`);
    }
    return services.serveLocal(resolution.location, request);
  }
}
