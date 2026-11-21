type FileExtension
  = | "html" | "css" | "js" | "json" | "txt" | "svg" | "png" | "jpg" | "jpeg" | "webp" | "ico" | "woff" | "woff2" | "map";

const EXTENSION_TO_TYPE: Record<FileExtension, string> = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  map: "application/json; charset=utf-8",
};

type FallbackType = "application/octet-stream";

const DEFAULT_TYPE: FallbackType = "application/octet-stream";

export class MimeUtil {
  static getContentType(path: string): string {
    const extension = path.split(".").pop()?.toLowerCase() ?? "";
    const isKnown = Object.hasOwn(EXTENSION_TO_TYPE, extension);
    return isKnown ? EXTENSION_TO_TYPE[extension as FileExtension] : DEFAULT_TYPE;
  }
}
