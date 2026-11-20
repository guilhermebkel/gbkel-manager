import { PageGenerator } from "#app/Generators/PageGenerator.ts";
import type { FolderEntry } from "#app/Protocols/SiteProtocol.ts";
import { HtmlUtil } from "#app/Utils/HtmlUtil.ts";

export class FolderPageGenerator {
  static generate(entries: FolderEntry[]): string {
    const links = entries.map((entry) => FolderPageGenerator.buildLink(entry));
    return PageGenerator.generate({ pageName: "Static", body: links.join("<br></br>\n") });
  }

  static buildLink(entry: FolderEntry): string {
    const isFolder = entry.kind === "folder";
    const target = isFolder ? "_self" : "_blank";
    const label = HtmlUtil.escape(entry.name);
    const text = isFolder ? `<br>/${label}</br>` : label;
    return `<a href="${HtmlUtil.escape(entry.relativePath)}" target="${target}">${text}</a>`;
  }
}
