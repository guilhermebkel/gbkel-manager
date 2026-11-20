import type { AdapterName } from "#app/Protocols/AliasProtocol.ts";

export type CliCommand = "sync" | "check";

export type CliArguments = {
  command: CliCommand;
  adapter?: AdapterName;
};
