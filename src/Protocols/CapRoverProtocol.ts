import type { LocalServer, UpstreamFetcher } from "#app/Protocols/ServeProtocol.ts";

export type CapRoverDomain = {
  publicDomain: string;
  hasSsl: boolean;
};

export interface CapRoverClientPort {
  listCustomDomains(appName: string): Promise<CapRoverDomain[]>;
  addCustomDomain(appName: string, domain: string): Promise<void>;
  enableSsl(appName: string, domain: string): Promise<void>;
  removeCustomDomain(appName: string, domain: string): Promise<void>;
}

export type CapRoverRemote = {
  client: CapRoverClientPort;
  appName: string;
};

export type CapRoverOptions = {
  fetchUpstream: UpstreamFetcher;
  serveLocal?: LocalServer;
  remote?: CapRoverRemote;
};

export type CapRoverApiSettings = {
  url: string;
  password: string;
};
