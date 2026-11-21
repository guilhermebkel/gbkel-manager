import type { Alias, AliasRequest, Resolution } from "#app/Protocols/AliasProtocol.ts";
import { AliasUtil } from "#app/Utils/AliasUtil.ts";

type ParamNameToValue = Record<string, string>;

const SPLAT_SEGMENT = "*";
const SPLAT_NAME = "splat";
const PARAM_PREFIX = ":";
const SEPARATOR = "/";

export class MatchUtil {
  static resolve(aliases: Alias[], request: AliasRequest): Resolution | null {
    const host = MatchUtil.normalizeHost(request.host);
    const segments = MatchUtil.splitPath(request.path);
    for (const alias of aliases) {
      const pattern = AliasUtil.getPathPattern(alias);
      const params = AliasUtil.getHost(alias) === host ? MatchUtil.matchPath(pattern, segments) : null;
      if (params !== null) {
        const location = MatchUtil.appendSearch(MatchUtil.buildLocation(alias.to, params), request.search);
        return { alias, location, mode: AliasUtil.getMode(alias), statusCode: alias.statusCode };
      }
    }
    return null;
  }

  static normalizeHost(host: string): string {
    const [name = ""] = host.toLowerCase().split(":");
    return name;
  }

  static splitPath(path: string): string[] {
    return path.split(SEPARATOR).filter((segment) => segment !== "");
  }

  static matchPath(pattern: string, segments: string[]): ParamNameToValue | null {
    const patternSegments = MatchUtil.splitPath(pattern);
    const params: ParamNameToValue = {};
    for (const [index, patternSegment] of patternSegments.entries()) {
      if (patternSegment === SPLAT_SEGMENT) {
        params[SPLAT_NAME] = segments.slice(index).join(SEPARATOR);
        return params;
      }
      const segment = segments[index];
      if (segment === undefined) {
        return null;
      }
      const isParam = patternSegment.startsWith(PARAM_PREFIX);
      if (isParam) {
        params[patternSegment.slice(PARAM_PREFIX.length)] = segment;
      } else if (patternSegment === segment) {
        continue;
      } else {
        return null;
      }
    }
    return patternSegments.length === segments.length ? params : null;
  }

  static buildLocation(target: string, params: ParamNameToValue): string {
    return target.replace(/:([A-Za-z_]\w*)/g, (token, name: string) => params[name] ?? token);
  }

  static appendSearch(location: string, search: string): string {
    const query = search.startsWith("?") ? search.slice(1) : search;
    if (query === "") {
      return location;
    }
    return location.includes("?") ? `${location}&${query}` : `${location}?${query}`;
  }
}
