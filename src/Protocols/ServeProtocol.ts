export type UpstreamFetcher = (request: Request) => Promise<Response>;

export type LocalServer = (path: string, request: Request) => Promise<Response>;

export type ServeServices = {
  fetchUpstream: UpstreamFetcher;
  serveLocal?: LocalServer;
};
