import type { CapRoverApiSettings, CapRoverClientPort, CapRoverDomain } from "#app/Protocols/CapRoverProtocol.ts";
import type { UpstreamFetcher } from "#app/Protocols/ServeProtocol.ts";

const SUCCESS_STATUS = 100;
const API_PATH = "/api/v2";
const APPS_PATH = `${API_PATH}/user/apps/appDefinitions`;

type ApiBody = Record<string, unknown>;

type AppDefinition = {
  appName: string;
  customDomain?: CapRoverDomain[];
};

type ApiData = {
  token?: string;
  appDefinitions?: AppDefinition[];
};

type ApiAnswer = {
  status?: number;
  description?: string;
  data?: ApiData;
};

export class CapRoverApiAdapter implements CapRoverClientPort {
  private readonly fetcher: UpstreamFetcher;

  private readonly settings: CapRoverApiSettings;

  private token: string | undefined;

  constructor(fetcher: UpstreamFetcher, settings: CapRoverApiSettings) {
    this.fetcher = fetcher;
    this.settings = settings;
  }

  async listCustomDomains(appName: string): Promise<CapRoverDomain[]> {
    const answer = await this.call("GET", APPS_PATH);
    const definitions = answer.data?.appDefinitions ?? [];
    const app = definitions.find((definition) => definition.appName === appName);
    if (app === undefined) {
      throw new Error(`The CapRover app "${appName}" does not exist`);
    }
    return (app.customDomain ?? []).map(({ publicDomain, hasSsl }) => ({ publicDomain, hasSsl }));
  }

  async addCustomDomain(appName: string, domain: string): Promise<void> {
    await this.call("POST", `${APPS_PATH}/customdomain`, { appName, customDomain: domain });
  }

  async enableSsl(appName: string, domain: string): Promise<void> {
    await this.call("POST", `${APPS_PATH}/enablecustomdomainssl`, { appName, customDomain: domain });
  }

  async removeCustomDomain(appName: string, domain: string): Promise<void> {
    await this.call("POST", `${APPS_PATH}/removecustomdomain`, { appName, customDomain: domain });
  }

  private async login(): Promise<string> {
    if (this.token === undefined) {
      const answer = await this.send("POST", `${API_PATH}/login`, { password: this.settings.password });
      this.token = answer.data?.token ?? "";
    }
    return this.token;
  }

  private async call(method: string, path: string, body?: ApiBody): Promise<ApiAnswer> {
    return this.send(method, path, body, await this.login());
  }

  private async send(method: string, path: string, body?: ApiBody, token?: string): Promise<ApiAnswer> {
    const headers = new Headers({ "content-type": "application/json", "x-namespace": "captain" });
    if (token !== undefined) {
      headers.set("x-captain-auth", token);
    }
    const init: RequestInit = { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) };
    const response = await this.fetcher(new Request(`${this.settings.url}${path}`, init));
    const answer = (await response.json()) as ApiAnswer;
    if (!response.ok || answer.status !== SUCCESS_STATUS) {
      throw new Error(`CapRover refused ${method} ${path}: ${answer.description ?? response.status}`);
    }
    return answer;
  }
}
