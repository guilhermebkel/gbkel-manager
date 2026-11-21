type PublishedRoot = "static" | "pages";

type DotSegment = "." | "..";

const ROOTS: readonly PublishedRoot[] = ["static", "pages"];
const FORBIDDEN_SEGMENTS: ReadonlySet<DotSegment> = new Set<DotSegment>([".", ".."]);
const SEPARATOR = "/";

export class LocalPathUtil {
  static readonly REDIRECTS_PAGE = "/redirects.html";

  static isRedirectsPage(target: string): boolean {
    return LocalPathUtil.stripQuery(target) === LocalPathUtil.REDIRECTS_PAGE;
  }

  static stripQuery(target: string): string {
    const [path = ""] = target.split(/[?#]/);
    return path;
  }

  static listCandidates(target: string): string[] {
    const decoded = LocalPathUtil.decode(LocalPathUtil.stripQuery(target));
    if (decoded === null || decoded.includes("\0") || decoded.includes("\\")) {
      return [];
    }
    const segments = decoded.split(SEPARATOR).filter((segment) => segment !== "");
    const [root = ""] = segments;
    const isPublished = ROOTS.includes(root as PublishedRoot);
    if (!isPublished || segments.some((segment) => FORBIDDEN_SEGMENTS.has(segment as DotSegment))) {
      return [];
    }
    const path = segments.join(SEPARATOR);
    return [path, `${path}.html`, `${path}/index.html`];
  }

  static decode(path: string): string | null {
    try {
      return decodeURIComponent(path);
    } catch {
      return null;
    }
  }
}
