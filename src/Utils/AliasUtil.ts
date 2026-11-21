import type { AdapterCapabilities } from "#app/Protocols/AdapterProtocol.ts";
import type { AdapterName, Alias, AliasMode } from "#app/Protocols/AliasProtocol.ts";

const PATH_PARAM = /:([A-Za-z_]\w*)/g;
const SPLAT = "*";

export class AliasUtil {
  static readonly PROXY_STATUS_CODE = 200;
  static readonly MOVED_PERMANENTLY = 301;
  static readonly FOUND = 302;
  static readonly SEE_OTHER = 303;
  static readonly TEMPORARY_REDIRECT = 307;
  static readonly PERMANENT_REDIRECT = 308;
  static readonly REDIRECT_STATUS_CODES: ReadonlySet<number> = new Set([
    AliasUtil.MOVED_PERMANENTLY,
    AliasUtil.FOUND,
    AliasUtil.SEE_OTHER,
    AliasUtil.TEMPORARY_REDIRECT,
    AliasUtil.PERMANENT_REDIRECT,
  ]);

  static getMode(alias: Alias): AliasMode {
    return alias.statusCode === AliasUtil.PROXY_STATUS_CODE ? "proxy" : "redirect";
  }

  static getHost(alias: Alias): string {
    const [host = ""] = alias.from.split("/");
    return host.toLowerCase();
  }

  static getPathPattern(alias: Alias): string {
    const separatorIndex = alias.from.indexOf("/");
    return separatorIndex === -1 ? "/" : alias.from.slice(separatorIndex);
  }

  static getParamNames(text: string): string[] {
    return [...text.matchAll(PATH_PARAM)].map((match) => match[1] ?? "");
  }

  static hasPathParams(alias: Alias): boolean {
    const pattern = AliasUtil.getPathPattern(alias);
    return pattern.includes(SPLAT) || AliasUtil.getParamNames(pattern).length > 0;
  }

  static isLocalTarget(alias: Alias): boolean {
    return alias.to.startsWith("/");
  }

  static isServedBy(alias: Alias, adapter: AdapterName): boolean {
    return alias.adapters === undefined || alias.adapters.includes(adapter);
  }

  static isClaimedBy(alias: Alias, adapter: AdapterName): boolean {
    return alias.adapters?.includes(adapter) === true;
  }

  static selectClaimedBy(aliases: Alias[], adapter: AdapterName): Alias[] {
    return aliases.filter((alias) => AliasUtil.isClaimedBy(alias, adapter));
  }

  static selectFor(aliases: Alias[], adapter: AdapterName): Alias[] {
    return aliases.filter((alias) => AliasUtil.isServedBy(alias, adapter));
  }

  static findMissingCapability(alias: Alias, capabilities: AdapterCapabilities): keyof AdapterCapabilities | null {
    if (AliasUtil.getMode(alias) === "proxy" && !capabilities.canProxy) {
      return "canProxy";
    }
    if (AliasUtil.hasPathParams(alias) && !capabilities.canMatchPathParams) {
      return "canMatchPathParams";
    }
    if (AliasUtil.isLocalTarget(alias) && !capabilities.canServeLocalTargets) {
      return "canServeLocalTargets";
    }
    return null;
  }
}
