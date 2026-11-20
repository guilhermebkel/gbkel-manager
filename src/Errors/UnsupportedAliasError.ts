export class UnsupportedAliasError extends Error {
  constructor(adapter: string, from: string, capability: string) {
    super(`${adapter} cannot serve ${from}: it needs ${capability}. Restrict the alias with "adapters" or use another adapter.`);
    this.name = "UnsupportedAliasError";
  }
}
