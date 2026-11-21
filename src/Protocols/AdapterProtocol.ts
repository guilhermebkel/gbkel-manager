import type { AdapterName, Alias } from "#app/Protocols/AliasProtocol.ts";

export type AdapterCapabilities = {
  canProxy: boolean;
  canMatchPathParams: boolean;
  canServeLocalTargets: boolean;
};

export type PlatformName = AdapterName | "cloudflare";

export interface AdapterPort {
  readonly name: PlatformName;
  readonly capabilities: AdapterCapabilities;
  sync(aliases: Alias[]): Promise<void>;
}

export interface RuntimeAdapterPort extends AdapterPort { handle(request: Request): Promise<Response> }
