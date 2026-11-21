import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { FolderPageGenerator } from "#app/Generators/FolderPageGenerator.ts";
import { RedirectsPageGenerator } from "#app/Generators/RedirectsPageGenerator.ts";
import type { Alias } from "#app/Protocols/AliasProtocol.ts";
import type { FolderEntry } from "#app/Protocols/SiteProtocol.ts";
import { LocalPathUtil } from "#app/Utils/LocalPathUtil.ts";
import { MimeUtil } from "#app/Utils/MimeUtil.ts";

const NOT_FOUND = 404;
const STATIC_ROOT = "static";
const SEPARATOR = "/";

export class LocalFilesSetup {
  static async serve(target: string, aliases: Alias[], root: string): Promise<Response> {
    if (LocalPathUtil.isRedirectsPage(target)) {
      return LocalFilesSetup.buildHtml(RedirectsPageGenerator.generate(aliases));
    }
    for (const candidate of LocalPathUtil.listCandidates(target)) {
      const found = await LocalFilesSetup.readCandidate(root, candidate);
      if (found !== null) {
        return found;
      }
    }
    return new Response("Not found", { status: NOT_FOUND });
  }

  static async readCandidate(root: string, candidate: string): Promise<Response | null> {
    const path = join(root, candidate);
    const info = await stat(path).catch(() => null);
    if (info === null) {
      return null;
    }
    if (info.isFile()) {
      const headers = { "content-type": MimeUtil.getContentType(candidate) };
      return new Response(await readFile(path), { headers });
    }
    const isStaticFolder = candidate === STATIC_ROOT || candidate.startsWith(`${STATIC_ROOT}${SEPARATOR}`);
    return isStaticFolder ? LocalFilesSetup.buildListing(root, candidate) : null;
  }

  static async buildListing(root: string, folder: string): Promise<Response> {
    const items = await readdir(join(root, folder), { withFileTypes: true });
    const inside = folder.slice(STATIC_ROOT.length);
    const entries: FolderEntry[] = items.map((item) => ({
      kind: item.isDirectory() ? "folder" : "file",
      name: item.name,
      relativePath: `${inside}${SEPARATOR}${item.name}`,
    }));
    return LocalFilesSetup.buildHtml(FolderPageGenerator.generate(entries));
  }

  static buildHtml(html: string): Response {
    return new Response(html, { headers: { "content-type": MimeUtil.getContentType("page.html") } });
  }
}
