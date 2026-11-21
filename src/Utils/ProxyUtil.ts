const HOP_BY_HOP_HEADERS = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];
const DECODED_BODY_HEADERS = ["content-encoding", "content-length"];
const BODYLESS_METHODS = ["GET", "HEAD"];

export class ProxyUtil {
  static copyHeaders(headers: Headers, removed: string[]): Headers {
    const copy = new Headers(headers);
    for (const name of removed) {
      copy.delete(name);
    }
    return copy;
  }

  static buildUpstreamRequest(request: Request, location: string): Request {
    const url = new URL(request.url);
    const headers = ProxyUtil.copyHeaders(request.headers, [...HOP_BY_HOP_HEADERS, "host", "content-length"]);
    headers.set("x-forwarded-host", url.host);
    const hasBody = !BODYLESS_METHODS.includes(request.method);
    const init: RequestInit & { duplex: "half" } = {
      headers,
      method: request.method,
      body: hasBody ? request.body : null,
      redirect: "manual",
      duplex: "half",
    };
    return new Request(location, init);
  }

  static buildProxyResponse(upstream: Response): Response {
    const headers = ProxyUtil.copyHeaders(upstream.headers, [...HOP_BY_HOP_HEADERS, ...DECODED_BODY_HEADERS]);
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers });
  }
}
