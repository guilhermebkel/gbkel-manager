import type { AdapterName, Alias } from "#app/Protocols/AliasProtocol.ts";

export type AdapterCapabilities = {
  canProxy: boolean;
  canMatchPathParams: boolean;
  canServeLocalTargets: boolean;
};

export interface AdapterPort {
  readonly name: AdapterName;
  readonly capabilities: AdapterCapabilities;
  sync(aliases: Alias[]): Promise<void>;
}
