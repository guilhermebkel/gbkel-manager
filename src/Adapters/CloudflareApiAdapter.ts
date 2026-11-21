import type {
  CloudflareApiSettings,
  CloudflareClientPort,
  CloudflareRecord,
  CloudflareRecordInput,
} from "#app/Protocols/CloudflareProtocol.ts";
import type { UpstreamFetcher } from "#app/Protocols/ServeProtocol.ts";

const API_URL = "https://api.cloudflare.com/client/v4";

type ApiError = { message: string };

type ApiAnswer<Result> = {
  success: boolean;
  errors?: ApiError[];
  result: Result;
};

export class CloudflareApiAdapter implements CloudflareClientPort {
  private readonly fetcher: UpstreamFetcher;

  private readonly settings: CloudflareApiSettings;

  constructor(fetcher: UpstreamFetcher, settings: CloudflareApiSettings) {
    this.fetcher = fetcher;
    this.settings = settings;
  }

  async findZoneId(zoneName: string): Promise<string> {
    const zones = await this.call<{ id: string }[]>("GET", `/zones?name=${encodeURIComponent(zoneName)}`);
    const [zone] = zones;
    if (zone === undefined) {
      throw new Error(`The Cloudflare zone "${zoneName}" was not found for this token`);
    }
    return zone.id;
  }

  async listRecords(zoneId: string, name: string): Promise<CloudflareRecord[]> {
    const path = `/zones/${zoneId}/dns_records?name=${encodeURIComponent(name)}`;
    const records = await this.call<CloudflareRecord[]>("GET", path);
    return records.map((record) => ({
      id: record.id,
      type: record.type,
      name: record.name,
      content: record.content,
      proxied: record.proxied,
    }));
  }

  async createRecord(zoneId: string, record: CloudflareRecordInput): Promise<void> {
    await this.call("POST", `/zones/${zoneId}/dns_records`, record);
  }

  async updateRecord(zoneId: string, recordId: string, record: CloudflareRecordInput): Promise<void> {
    await this.call("PUT", `/zones/${zoneId}/dns_records/${recordId}`, record);
  }

  private async call<Result>(method: string, path: string, body?: CloudflareRecordInput): Promise<Result> {
    const headers = new Headers({ "authorization": `Bearer ${this.settings.token}`, "content-type": "application/json" });
    const init: RequestInit = { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) };
    const response = await this.fetcher(new Request(`${API_URL}${path}`, init));
    const answer = (await response.json()) as ApiAnswer<Result>;
    if (!response.ok || !answer.success) {
      const reasons = (answer.errors ?? []).map((error) => error.message).join("; ");
      throw new Error(`Cloudflare refused ${method} ${path.split("?")[0]}: ${reasons === "" ? response.status : reasons}`);
    }
    return answer.result;
  }
}
