declare module "netlify" {
  export default class NetlifyAPI {
    constructor(accessToken: string);
    updateSite(params: {
      site_id: string;
      body: { domain_aliases: string[] };
    }): Promise<unknown>;
  }
}
