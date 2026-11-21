import type { PlatformName } from "#app/Protocols/AdapterProtocol.ts";

export type CliCommand = "sync" | "check";

export type CliArguments = {
  command: CliCommand;
  adapter?: PlatformName;
};
