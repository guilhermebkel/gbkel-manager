import type { AdapterCapabilities, AdapterPort } from "#app/Protocols/AdapterProtocol.ts";
import type { AdapterName, Alias } from "#app/Protocols/AliasProtocol.ts";
import type { FileWriter, NetlifyClientPort, NetlifySettings } from "#app/Protocols/NetlifyProtocol.ts";
import { AliasUtil } from "#app/Utils/AliasUtil.ts";
import { CapabilityUtil } from "#app/Utils/CapabilityUtil.ts";

const BLOCK_SEPARATOR = "\n\n";
const FORCE_MARK = "!";

export class NetlifyAdapter implements AdapterPort {
  readonly name: AdapterName = "netlify";
  static readonly CAPABILITIES: AdapterCapabilities = {
    canProxy: true,
    canMatchPathParams: true,
    canServeLocalTargets: true,
  };

  readonly capabilities: AdapterCapabilities = NetlifyAdapter.CAPABILITIES;

  private readonly client: NetlifyClientPort;
  private readonly settings: NetlifySettings;
  private readonly writeFile: FileWriter;

  constructor(client: NetlifyClientPort, settings: NetlifySettings, writeFile: FileWriter) {
    this.client = client;
    this.settings = settings;
    this.writeFile = writeFile;
  }

  static buildRedirectsFile(aliases: Alias[]): string {
    return aliases.map((alias) => {
      const rule = `${alias.to} ${alias.statusCode}${FORCE_MARK}`;
      return `http://${alias.from} ${rule}\nhttps://${alias.from} ${rule}`;
    }).join(BLOCK_SEPARATOR);
  }

  static listHosts(aliases: Alias[]): string[] {
    return [...new Set(aliases.map((alias) => AliasUtil.getHost(alias)))];
  }

  async sync(aliases: Alias[]): Promise<void> {
    const served = CapabilityUtil.assertServable(this.name, this.capabilities, aliases);
    const domainAliases = NetlifyAdapter.listHosts(served);
    await this.client.updateSite({ site_id: this.settings.siteId, body: { domain_aliases: domainAliases } });
    await this.writeFile(this.settings.redirectsFilePath, NetlifyAdapter.buildRedirectsFile(served));
  }
}
