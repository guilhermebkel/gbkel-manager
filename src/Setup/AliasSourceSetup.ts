import { readFile } from "node:fs/promises";
import type { Alias } from "#app/Protocols/AliasProtocol.ts";
import { AliasSchema } from "#app/Schemas/AliasSchema.ts";

export class AliasSourceSetup {
  static async load(file: string, url?: string): Promise<Alias[]> {
    const raw: unknown = url === undefined ? JSON.parse(await readFile(file, "utf8")) : await AliasSourceSetup.download(url);
    return AliasSchema.parse(raw);
  }

  static async download(url: string): Promise<unknown> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`The alias file answered ${response.status}`);
    }
    return response.json();
  }
}
