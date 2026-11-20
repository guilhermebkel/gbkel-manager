import type { AdapterCapabilities, RuntimeAdapterPort } from "#app/Protocols/AdapterProtocol.ts";
import type { AdapterName, Alias } from "#app/Protocols/AliasProtocol.ts";
import type { CapRoverRemote } from "#app/Protocols/CapRoverProtocol.ts";
import type { UpstreamFetcher } from "#app/Protocols/ServeProtocol.ts";
import { AliasUtil } from "#app/Utils/AliasUtil.ts";
import { CapabilityUtil } from "#app/Utils/CapabilityUtil.ts";
import { ServeUtil } from "#app/Utils/ServeUtil.ts";

const HEALTH_PATH = "/healthz";
const NOT_FOUND = 404;
const OK = 200;

export class CapRoverAdapter implements RuntimeAdapterPort {
  static readonly CAPABILITIES: AdapterCapabilities = {
    canProxy: true,
    canMatchPathParams: true,
    canServeLocalTargets: false,
  };

  readonly name: AdapterName = "caprover";

  readonly capabilities: AdapterCapabilities = CapRoverAdapter.CAPABILITIES;

  private readonly fetchUpstream: UpstreamFetcher;

  private readonly remote: CapRoverRemote | undefined;

  private served: Alias[] = [];

  constructor(fetchUpstream: UpstreamFetcher, remote?: CapRoverRemote) {
    this.fetchUpstream = fetchUpstream;
    this.remote = remote;
  }

  async sync(aliases: Alias[]): Promise<void> {
    this.served = CapabilityUtil.assertServable(this.name, this.capabilities, aliases);
    if (this.remote !== undefined) {
      await this.syncDomains(this.remote, this.served);
    }
  }

  async handle(request: Request): Promise<Response> {
    const response = await ServeUtil.serve(this.served, request, { fetchUpstream: this.fetchUpstream });
    if (response !== null) {
      return response;
    }
    const isHealthCheck = new URL(request.url).pathname === HEALTH_PATH;
    return isHealthCheck ? new Response("ok", { status: OK }) : new Response("Not found", { status: NOT_FOUND });
  }

  private async syncDomains(remote: CapRoverRemote, served: Alias[]): Promise<void> {
    const { client, appName } = remote;
    const wanted = new Set(served.map((alias) => AliasUtil.getHost(alias)));
    const existing = await client.listCustomDomains(appName);
    const known = new Set(existing.map((domain) => domain.publicDomain));
    const withoutSsl = new Set(existing.filter((domain) => !domain.hasSsl).map((domain) => domain.publicDomain));
    for (const host of wanted) {
      if (!known.has(host)) {
        await client.addCustomDomain(appName, host);
      }
      if (!known.has(host) || withoutSsl.has(host)) {
        await client.enableSsl(appName, host);
      }
    }
    for (const domain of known) {
      if (!wanted.has(domain)) {
        await client.removeCustomDomain(appName, domain);
      }
    }
  }
}
