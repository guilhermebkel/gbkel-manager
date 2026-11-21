import { describe, expect, it } from "vitest";
import { CapRoverApiAdapter } from "#app/Adapters/CapRoverApiAdapter.ts";

type Call = {
  method: string;
  path: string;
  token: string | null;
  body: string;
};

const BASE_URL = "https://captain.example.com";
const PASSWORD = "fake-password-123";
const DOMAIN = "a.example.com";
const APP = "redirects";
const LOGIN_PATH = "/api/v2/login";
const APPS_PATH = "/api/v2/user/apps/appDefinitions";
const LOGIN = { [LOGIN_PATH]: { token: "token-1" } };

const createApi = (answers: Record<string, unknown>) => {
  const calls: Call[] = [];
  const fetchFake = async (request: Request) => {
    const { pathname } = new URL(request.url);
    const { method, headers } = request;
    calls.push({ method, path: pathname, token: headers.get("x-captain-auth"), body: await request.text() });
    return new Response(JSON.stringify({ status: 100, data: answers[pathname] ?? {} }), { status: 200 });
  };
  const api = new CapRoverApiAdapter(fetchFake, { url: BASE_URL, password: PASSWORD });
  return { api, calls };
};

const DEFINITIONS = {
  appDefinitions: [
    { appName: "other" },
    { appName: APP, customDomain: [{ publicDomain: DOMAIN, hasSsl: true, extra: 1 }] },
  ],
};

describe("CapRoverApiAdapter.listCustomDomains()", () => {
  it("logs in once and lists the custom domains of the app", async () => {
    const { api, calls } = createApi({ ...LOGIN, [APPS_PATH]: DEFINITIONS });

    const first = await api.listCustomDomains(APP);
    await api.listCustomDomains(APP);

    expect(first).toStrictEqual([{ publicDomain: DOMAIN, hasSsl: true }]);
    expect(calls.filter((call) => call.path === LOGIN_PATH)).toHaveLength(1);
    expect(calls[0]?.body).toBe(JSON.stringify({ password: PASSWORD }));
    expect(calls[1]?.token).toBe("token-1");
  });

  it("fails when the app does not exist", async () => {
    const { api } = createApi({ ...LOGIN, [APPS_PATH]: { appDefinitions: [] } });

    await expect(api.listCustomDomains(APP)).rejects.toThrow("The CapRover app \"redirects\" does not exist");
  });
});

describe("CapRoverApiAdapter.addCustomDomain()", () => {
  it("posts the app and the domain", async () => {
    const { api, calls } = createApi(LOGIN);

    await api.addCustomDomain(APP, DOMAIN);

    expect(calls[1]).toStrictEqual({
      method: "POST",
      path: `${APPS_PATH}/customdomain`,
      token: "token-1",
      body: JSON.stringify({ appName: APP, customDomain: DOMAIN }),
    });
  });

  it("fails with the description CapRover gave, never with the password", async () => {
    const answer = new Response(JSON.stringify({ status: 1000, description: "wrong password" }), { status: 200 });
    const api = new CapRoverApiAdapter(() => Promise.resolve(answer), { url: BASE_URL, password: PASSWORD });

    const failure = await api.addCustomDomain(APP, DOMAIN).catch((error: unknown) => String(error));

    expect(failure).toBe("Error: CapRover refused POST /api/v2/login: wrong password");
    expect(failure).not.toContain(PASSWORD);
  });
});

describe("CapRoverApiAdapter.enableSsl()", () => {
  it("posts the app and the domain to the SSL route", async () => {
    const { api, calls } = createApi(LOGIN);

    await api.enableSsl(APP, DOMAIN);

    expect(calls[1]?.path).toBe(`${APPS_PATH}/enablecustomdomainssl`);
  });
});

describe("CapRoverApiAdapter.removeCustomDomain()", () => {
  it("posts the app and the domain to the removal route", async () => {
    const { api, calls } = createApi(LOGIN);

    await api.removeCustomDomain(APP, DOMAIN);

    expect(calls[1]?.path).toBe(`${APPS_PATH}/removecustomdomain`);
  });
});
