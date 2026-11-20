import { existsSync } from "node:fs";

const ENV_FILE = ".env";

export class EnvSetup {
  static load(): void {
    if (existsSync(ENV_FILE)) {
      process.loadEnvFile(ENV_FILE);
    }
  }

  static read(name: string): string | undefined {
    const value = process.env[name];
    return value === "" ? undefined : value;
  }

  static readRequired(name: string): string {
    const value = EnvSetup.read(name);
    if (value === undefined) {
      throw new Error(`Missing environment variable ${name}`);
    }
    return value;
  }
}
