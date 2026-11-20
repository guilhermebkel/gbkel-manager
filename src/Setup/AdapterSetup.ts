import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import NetlifyAPI from "netlify";
import { CapRoverAdapter } from "#app/Adapters/CapRoverAdapter.ts";
import { CapRoverApiAdapter } from "#app/Adapters/CapRoverApiAdapter.ts";
import { NetlifyAdapter } from "#app/Adapters/NetlifyAdapter.ts";
import type { AdapterCapabilities, AdapterPort } from "#app/Protocols/AdapterProtocol.ts";
import type { AdapterName } from "#app/Protocols/AliasProtocol.ts";
import { EnvSetup } from "#app/Setup/EnvSetup.ts";

type AdapterEntry = {
  capabilities: AdapterCapabilities;
  create: () => AdapterPort;
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
  return new CapRoverAdapter((request) => fetch(request), { client, appName });
};

export class AdapterSetup {
  static readonly NAME_TO_ENTRY: Record<AdapterName, AdapterEntry> = {
    netlify: { capabilities: NetlifyAdapter.CAPABILITIES, create: createNetlifyAdapter },
    caprover: { capabilities: CapRoverAdapter.CAPABILITIES, create: createCapRoverAdapter },
  };

  static listNames(): AdapterName[] {
    return Object.keys(AdapterSetup.NAME_TO_ENTRY) as AdapterName[];
  }

  static getEntry(name: AdapterName): AdapterEntry {
    const entry = AdapterSetup.NAME_TO_ENTRY[name] as AdapterEntry | undefined;
    if (entry === undefined) {
      throw new Error(`Unknown adapter "${name}". Available: ${AdapterSetup.listNames().join(", ")}`);
    }
    return entry;
  }
}
