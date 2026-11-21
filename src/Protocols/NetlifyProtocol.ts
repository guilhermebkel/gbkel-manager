export type UpdateSiteParams = {
  site_id: string;
  body: { domain_aliases: string[] };
};

export interface NetlifyClientPort { updateSite(params: UpdateSiteParams): Promise<unknown> }

export type NetlifySettings = {
  siteId: string;
  redirectsFilePath: string;
};

export type FileWriter = (path: string, content: string) => Promise<void>;
