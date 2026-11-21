import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import NetlifyAPI from "netlify";
import { CloudflareAdapter } from "#app/Adapters/CloudflareAdapter.ts";
import { CloudflareApiAdapter } from "#app/Adapters/CloudflareApiAdapter.ts";
import { CapRoverAdapter } from "#app/Adapters/CapRoverAdapter.ts";
import { CapRoverApiAdapter } from "#app/Adapters/CapRoverApiAdapter.ts";
import { NetlifyAdapter } from "#app/Adapters/NetlifyAdapter.ts";
import type { AdapterCapabilities, AdapterPort, PlatformName } from "#app/Protocols/AdapterProtocol.ts";
import type { AdapterName, Alias } from "#app/Protocols/AliasProtocol.ts";
import { EnvSetup } from "#app/Setup/EnvSetup.ts";
import { CapabilityUtil } from "#app/Utils/CapabilityUtil.ts";

type AdapterEntry = {
  capabilities: AdapterCapabilities;
  create: () => AdapterPort;
  check: (aliases: Alias[]) => string;
};

const REDIRECTS_FILE = "_redirects";

const createNetlifyAdapter = (): AdapterPort => {
  const client = new NetlifyAPI(EnvSetup.readRequired("NETLIFY_ACCESS_TOKEN"));
  const siteId = EnvSetup.readRequired("NETLIFY_SITE_ID");
  const redirectsFilePath = join(process.cwd(), REDIRECTS_FILE);
  return new NetlifyAdapter(client, { siteId, redirectsFilePath }, (path, content) => writeFile(path, content));
};

const createCapRoverAdapter = (): AdapterPort => {
  const url = EnvSetup.readRequired("CAPROVER_URL");
  const password = EnvSetup.readRequired("CAPROVER_PASSWORD");
  const appName = EnvSetup.readRequired("CAPROVER_APP");
  const client = new CapRoverApiAdapter((request) => fetch(request), { url, password });
  return new CapRoverAdapter({ fetchUpstream: (request) => fetch(request), remote: { client, appName } });
};

const createCloudflareAdapter = (): AdapterPort => {
  const token = EnvSetup.readRequired("CLOUDFLARE_API_TOKEN");
  const zoneName = EnvSetup.readRequired("CLOUDFLARE_ZONE");
  const target = EnvSetup.readRequired("CLOUDFLARE_CNAME_TARGET");
  const client = new CloudflareApiAdapter((request) => fetch(request), { token });
  return new CloudflareAdapter(client, { zoneName, target });
};

const checkServing = (name: AdapterName, capabilities: AdapterCapabilities, aliases: Alias[]): string => {
  const served = CapabilityUtil.assertServable(name, capabilities, aliases);
  return `${name}: ${served.length} of ${aliases.length} aliases can be served`;
};

const checkCloudflare = (aliases: Alias[]): string => {
  return `cloudflare: ${CloudflareAdapter.listHosts(aliases).length} hosts to point at CapRover`;
};

export class AdapterSetup {
  static readonly NAME_TO_ENTRY: Record<PlatformName, AdapterEntry> = {
    cloudflare: {
      capabilities: CloudflareAdapter.CAPABILITIES,
      create: createCloudflareAdapter,
      check: checkCloudflare,
    },
    caprover: {
      capabilities: CapRoverAdapter.CAPABILITIES,
      create: createCapRoverAdapter,
      check: (aliases) => checkServing("caprover", CapRoverAdapter.CAPABILITIES, aliases),
    },
    netlify: {
      capabilities: NetlifyAdapter.CAPABILITIES,
      create: createNetlifyAdapter,
      check: (aliases) => checkServing("netlify", NetlifyAdapter.CAPABILITIES, aliases),
    },
  };

  static listNames(): PlatformName[] {
    return Object.keys(AdapterSetup.NAME_TO_ENTRY) as PlatformName[];
  }

  static getEntry(name: PlatformName): AdapterEntry {
    const entry = AdapterSetup.NAME_TO_ENTRY[name] as AdapterEntry | undefined;
    if (entry === undefined) {
      throw new Error(`Unknown adapter "${name}". Available: ${AdapterSetup.listNames().join(", ")}`);
    }
    return entry;
  }
}
