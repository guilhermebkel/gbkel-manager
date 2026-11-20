import { InvalidAliasError } from "#app/Errors/InvalidAliasError.ts";
import type { AdapterName, Alias } from "#app/Protocols/AliasProtocol.ts";
import { AliasUtil } from "#app/Utils/AliasUtil.ts";

const ADAPTER_NAMES: ReadonlySet<AdapterName> = new Set<AdapterName>([
  "netlify",
  "caprover",
]);
const ABSOLUTE_TARGET = /^https?:\/\/\S+$/;
const LOCAL_TARGET = /^\/\S*$/;
const HOST = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
const SPLAT = "*";

type RawAlias = Record<string, unknown>;

export class AliasSchema {
  static parse(raw: unknown): Alias[] {
    if (typeof raw !== "object" || raw === null || !("domainAliases" in raw) || !Array.isArray(raw.domainAliases)) {
      throw new InvalidAliasError("domainAliases.json must be an object with a \"domainAliases\" array");
    }
    const aliases = raw.domainAliases.map((entry: unknown) => AliasSchema.parseAlias(entry));
    AliasSchema.assertUniqueFrom(aliases);
    return aliases;
  }

  static parseAlias(entry: unknown): Alias {
    if (typeof entry !== "object" || entry === null) {
      throw new InvalidAliasError("every alias must be an object");
    }
    const raw: RawAlias = { ...entry };
    const { from, to, statusCode } = raw;
    if (typeof from !== "string" || typeof to !== "string" || typeof statusCode !== "number") {
      throw new InvalidAliasError("\"from\" and \"to\" must be strings and \"statusCode\" a number", String(from));
    }
    const alias: Alias = { from, to, statusCode };
    const adapters = AliasSchema.parseAdapters(raw.adapters, from);
    if (adapters !== undefined) {
      alias.adapters = adapters;
    }
    AliasSchema.assertFrom(alias);
    AliasSchema.assertTarget(alias);
    AliasSchema.assertStatusCode(alias);
    return alias;
  }

  static parseAdapters(raw: unknown, from: string): AdapterName[] | undefined {
    if (raw === undefined) {
      return undefined;
    }
    const isList = Array.isArray(raw) && raw.length > 0;
    const isValid = isList && raw.every((name: unknown) => ADAPTER_NAMES.has(name as AdapterName));
    if (!isValid) {
      throw new InvalidAliasError(`"adapters" must be a non-empty list of: ${[...ADAPTER_NAMES].join(", ")}`, from);
    }
    return raw as AdapterName[];
  }

  static assertFrom(alias: Alias): void {
    if (!HOST.test(AliasUtil.getHost(alias))) {
      throw new InvalidAliasError("\"from\" must start with a host such as app.example.com", alias.from);
    }
    const pattern = AliasUtil.getPathPattern(alias);
    const segments = pattern.split("/").filter((segment) => segment !== "");
    const splatIndex = segments.indexOf(SPLAT);
    if (splatIndex !== -1 && splatIndex !== segments.length - 1) {
      throw new InvalidAliasError("\"*\" is allowed only as the last path segment", alias.from);
    }
  }

  static assertTarget(alias: Alias): void {
    if (!ABSOLUTE_TARGET.test(alias.to) && !LOCAL_TARGET.test(alias.to)) {
      throw new InvalidAliasError("\"to\" must be an http(s) URL or a path that starts with \"/\"", alias.from);
    }
    if (AliasSchema.hasParamInAuthority(alias.to)) {
      throw new InvalidAliasError("a path parameter cannot be part of the host of \"to\"", alias.from);
    }
    const known = new Set(AliasUtil.getParamNames(AliasUtil.getPathPattern(alias)));
    if (AliasUtil.getPathPattern(alias).includes(SPLAT)) {
      known.add("splat");
    }
    const unknown = AliasUtil.getParamNames(alias.to).filter((name) => !known.has(name));
    if (unknown.length > 0) {
      throw new InvalidAliasError(`"to" uses :${unknown.join(", :")}, which "from" does not define`, alias.from);
    }
  }

  static hasParamInAuthority(target: string): boolean {
    const [authority = ""] = target.replace(/^https?:\/\//, "").split(/[/?#]/);
    return AliasUtil.getParamNames(authority).length > 0 || authority.includes(SPLAT);
  }

  static assertStatusCode(alias: Alias): void {
    const { statusCode } = alias;
    const isKnown = statusCode === AliasUtil.PROXY_STATUS_CODE || AliasUtil.REDIRECT_STATUS_CODES.has(statusCode);
    if (!isKnown) {
      throw new InvalidAliasError("\"statusCode\" must be 200 (proxy) or 301, 302, 303, 307, 308", alias.from);
    }
  }

  static assertUniqueFrom(aliases: Alias[]): void {
    const seen = new Set<string>();
    for (const alias of aliases) {
      const key = alias.from.toLowerCase();
      if (seen.has(key)) {
        throw new InvalidAliasError("duplicated \"from\"", alias.from);
      }
      seen.add(key);
    }
  }
}
