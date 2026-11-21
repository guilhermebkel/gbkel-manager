import type { PageContent } from "#app/Protocols/SiteProtocol.ts";

const DEFAULT_SCRIPT = "https://static.guilherr.me/js/default.js";

export class PageGenerator {
  static generate(content: PageContent): string {
    const style = content.style === undefined ? "" : `<style>${content.style}</style>`;
    const pageName = JSON.stringify(content.pageName).replaceAll("<", "\\u003c");
    return [
      "<!DOCTYPE html>",
      "<html>",
      `<head>${style}<script src="${DEFAULT_SCRIPT}"></script></head>`,
      "<body>",
      content.body,
      `<script>renderDefaultHead({ pageName: ${pageName} }); renderDefaultBackground({ selector: "body" });</script>`,
      "</body>",
      "</html>",
      "",
    ].join("\n");
  }
}
