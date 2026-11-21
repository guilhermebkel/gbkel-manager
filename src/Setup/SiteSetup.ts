import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { FolderPageGenerator } from "#app/Generators/FolderPageGenerator.ts";
import { RedirectsPageGenerator } from "#app/Generators/RedirectsPageGenerator.ts";
import type { FolderEntry } from "#app/Protocols/SiteProtocol.ts";
import { AliasSchema } from "#app/Schemas/AliasSchema.ts";

const STATIC_FOLDER = "static";
const ALIASES_FILE = "domainAliases.json";
const REDIRECTS_PAGE = "redirects.html";
const FOLDER_PAGE = "index.html";

export class SiteSetup {
  static async listEntries(folder: string): Promise<FolderEntry[]> {
    const items = await readdir(join(STATIC_FOLDER, folder), { withFileTypes: true });
    return items
      .filter((item) => item.name !== FOLDER_PAGE)
      .map((item) => ({
        kind: item.isDirectory() ? "folder" : "file",
        name: item.name,
        relativePath: `/${join(folder, item.name).split(sep).join("/")}`,
      }));
  }

  static async listFolders(folder: string): Promise<string[]> {
    const items = await readdir(join(STATIC_FOLDER, folder), { withFileTypes: true });
    const children = items.filter((item) => item.isDirectory()).map((item) => join(folder, item.name));
    const descendants = await Promise.all(children.map((child) => SiteSetup.listFolders(child)));
    return [folder, ...children, ...descendants.flat()].filter((path, index, all) => all.indexOf(path) === index);
  }

  static async writeFolderPages(): Promise<number> {
    const folders = await SiteSetup.listFolders("");
    for (const folder of folders) {
      const entries = await SiteSetup.listEntries(folder);
      const page = FolderPageGenerator.generate(entries);
      const pagePath = join(STATIC_FOLDER, folder, FOLDER_PAGE);
      await writeFile(pagePath, page);
    }
    return folders.length;
  }

  static async writeRedirectsPage(): Promise<number> {
    const raw: unknown = JSON.parse(await readFile(ALIASES_FILE, "utf8"));
    const aliases = AliasSchema.parse(raw);
    await writeFile(REDIRECTS_PAGE, RedirectsPageGenerator.generate(aliases));
    return aliases.length;
  }

  static async run(): Promise<void> {
    const folders = await SiteSetup.writeFolderPages();
    const aliases = await SiteSetup.writeRedirectsPage();
    console.log(`site: ${folders} folder pages, ${aliases} redirects listed`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await SiteSetup.run();
}
