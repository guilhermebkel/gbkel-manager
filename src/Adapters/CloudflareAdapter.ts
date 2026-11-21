import type { AdapterCapabilities, AdapterPort, PlatformName } from "#app/Protocols/AdapterProtocol.ts";
import type { Alias } from "#app/Protocols/AliasProtocol.ts";
import type {
  CloudflareClientPort,
  CloudflareRecord,
  CloudflareRecordInput,
  CloudflareSettings,
} from "#app/Protocols/CloudflareProtocol.ts";
import { AliasUtil } from "#app/Utils/AliasUtil.ts";

const AUTOMATIC_TTL = 1;

export class CloudflareAdapter implements AdapterPort {
  static readonly CAPABILITIES: AdapterCapabilities = {
    canProxy: false,
    canMatchPathParams: false,
    canServeLocalTargets: false,
  };

  readonly name: PlatformName = "cloudflare";

  readonly capabilities: AdapterCapabilities = CloudflareAdapter.CAPABILITIES;

  private readonly client: CloudflareClientPort;

  private readonly settings: CloudflareSettings;

  constructor(client: CloudflareClientPort, settings: CloudflareSettings) {
    if (!settings.zoneName.includes(".")) {
      throw new Error("CLOUDFLARE_ZONE must be the zone name, such as example.com, not the zone id");
    }
    this.client = client;
    this.settings = settings;
  }

  static listHosts(aliases: Alias[]): string[] {
    const claimed = AliasUtil.selectClaimedBy(aliases, "caprover");
    return [...new Set(claimed.map((alias) => AliasUtil.getHost(alias)))];
  }

  async sync(aliases: Alias[]): Promise<void> {
    const hosts = CloudflareAdapter.listHosts(aliases);
    for (const host of hosts) {
      this.assertInZone(host);
    }
    if (hosts.length === 0) {
      return;
    }
    const zoneId = await this.client.findZoneId(this.settings.zoneName);
    for (const host of hosts) {
      await this.syncHost(zoneId, host);
    }
  }

  private assertInZone(host: string): void {
    const { zoneName } = this.settings;
    if (host !== zoneName && !host.endsWith(`.${zoneName}`)) {
      throw new Error(`${host} is not in the Cloudflare zone ${zoneName}`);
    }
  }

  private async syncHost(zoneId: string, host: string): Promise<void> {
    const wanted: CloudflareRecordInput = {
      type: "CNAME",
      name: host,
      content: this.settings.target,
      proxied: false,
      ttl: AUTOMATIC_TTL,
    };
    const existing = await this.client.listRecords(zoneId, host);
    const [first] = existing;
    if (first === undefined) {
      await this.client.createRecord(zoneId, wanted);
      return;
    }
    const conflict = existing.find((record) => record.type !== "CNAME");
    if (conflict !== undefined) {
      throw new Error(`${host} already has a ${conflict.type} record; remove it in Cloudflare so a CNAME can take its place`);
    }
    if (!CloudflareAdapter.isUpToDate(first, wanted)) {
      await this.client.updateRecord(zoneId, first.id, wanted);
    }
  }

  private static isUpToDate(record: CloudflareRecord, wanted: CloudflareRecordInput): boolean {
    return record.content === wanted.content && record.proxied === wanted.proxied;
  }
}
