export type AliasMode = "redirect" | "proxy";

export type AdapterName = "netlify" | "docker" | "caprover" | "cloudflare-workers";

export type Alias = {
  from: string;
  to: string;
  statusCode: number;
  adapters?: AdapterName[];
};

export type AliasRequest = {
  host: string;
  path: string;
  search: string;
};

export type Resolution = {
  alias: Alias;
  mode: AliasMode;
  statusCode: number;
  location: string;
};
