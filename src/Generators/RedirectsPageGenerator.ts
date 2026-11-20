import { PageGenerator } from "#app/Generators/PageGenerator.ts";
import type { Alias } from "#app/Protocols/AliasProtocol.ts";
import { HtmlUtil } from "#app/Utils/HtmlUtil.ts";

const STYLE = "p { color: var(--gray-color-15) !important; }";

export class RedirectsPageGenerator {
  static generate(aliases: Alias[]): string {
    const rules = aliases.map((alias) => `https://${alias.from} ${alias.to} ${alias.statusCode}!`);
    const lines = rules.map((rule) => `<p>${HtmlUtil.escape(rule)}</p>`);
    return PageGenerator.generate({ pageName: "Redirects", body: lines.join("\n"), style: STYLE });
  }
}
