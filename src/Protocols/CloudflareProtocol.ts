export type CloudflareRecord = {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
};

export type CloudflareRecordInput = {
  type: "CNAME";
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
};

export interface CloudflareClientPort {
  findZoneId(zoneName: string): Promise<string>;
  listRecords(zoneId: string, name: string): Promise<CloudflareRecord[]>;
  createRecord(zoneId: string, record: CloudflareRecordInput): Promise<void>;
  updateRecord(zoneId: string, recordId: string, record: CloudflareRecordInput): Promise<void>;
}

export type CloudflareSettings = {
  zoneName: string;
  target: string;
};

export type CloudflareApiSettings = { token: string };
