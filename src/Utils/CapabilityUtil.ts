import { UnsupportedAliasError } from "#app/Errors/UnsupportedAliasError.ts";
import type { AdapterCapabilities } from "#app/Protocols/AdapterProtocol.ts";
import type { AdapterName, Alias } from "#app/Protocols/AliasProtocol.ts";
import { AliasUtil } from "#app/Utils/AliasUtil.ts";

export class CapabilityUtil {
  static assertServable(adapter: AdapterName, capabilities: AdapterCapabilities, aliases: Alias[]): Alias[] {
    const served = AliasUtil.selectFor(aliases, adapter);
    for (const alias of served) {
      const missing = AliasUtil.findMissingCapability(alias, capabilities);
      if (missing !== null) {
        throw new UnsupportedAliasError(adapter, alias.from, missing);
      }
    }
    return served;
  }
}
