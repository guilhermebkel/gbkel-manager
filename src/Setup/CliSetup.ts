import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { CliArguments, CliCommand } from "#app/Protocols/CliProtocol.ts";
import type { AdapterName } from "#app/Protocols/AliasProtocol.ts";
import { AliasSchema } from "#app/Schemas/AliasSchema.ts";
import { AdapterSetup } from "#app/Setup/AdapterSetup.ts";
import { EnvSetup } from "#app/Setup/EnvSetup.ts";
import { CapabilityUtil } from "#app/Utils/CapabilityUtil.ts";

const ALIASES_FILE = "domainAliases.json";
const FIRST_USER_ARG = 2;
const COMMANDS: readonly CliCommand[] = ["sync", "check"];
const USAGE = "Usage: node src/Setup/CliSetup.ts <sync|check> [--adapter <name>]";

export class CliSetup {
  static parseArguments(argv: string[]): CliArguments {
    const [command, ...rest] = argv as [CliCommand | undefined, ...string[]];
    if (command === undefined || !COMMANDS.includes(command)) {
      throw new Error(USAGE);
    }
    const adapterIndex = rest.indexOf("--adapter");
    if (adapterIndex === -1) {
      return { command };
    }
    const adapter = rest[adapterIndex + 1] as AdapterName | undefined;
    if (adapter === undefined) {
      throw new Error(USAGE);
    }
    return { command, adapter };
  }

  static async run(argv: string[]): Promise<number> {
    EnvSetup.load();
    const { command, adapter } = CliSetup.parseArguments(argv);
    const raw: unknown = JSON.parse(await readFile(ALIASES_FILE, "utf8"));
    const aliases = AliasSchema.parse(raw);
    const names = adapter === undefined ? AdapterSetup.listNames() : [adapter];
    for (const name of names) {
      const entry = AdapterSetup.getEntry(name);
      const served = CapabilityUtil.assertServable(name, entry.capabilities, aliases);
      console.log(`${name}: ${served.length} of ${aliases.length} aliases can be served`);
      if (command === "check") {
        continue;
      }
      await entry.create().sync(aliases);
      console.log(`${name}: synced`);
    }
    return 0;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await CliSetup.run(process.argv.slice(FIRST_USER_ARG));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
