# Adapters

How an adapter serves `domainAliases.json`, and how to add a platform. The terms are in `GLOSSARY.md`; the decision is ADR 0002.

## The alias file

```json
{
  "domainAliases": [
    { "from": "linkedin.guilherr.me", "to": "https://linkedin.com/in/someone", "statusCode": 301 },
    { "from": "notion.guilherr.me/:pageId", "to": "https://notion.so/me/:pageId", "statusCode": 301 },
    { "from": "blog.guilherr.me/*", "to": "https://guilherr.me/:splat", "statusCode": 200 },
    { "from": "static.guilherr.me/*", "to": "/static/:splat", "statusCode": 200, "adapters": ["netlify"] }
  ]
}
```

- The first alias in file order that matches wins.
- `statusCode` `200` proxies; `301`, `302`, `303`, `307` and `308` redirect. Nothing else is valid.
- A `to` that starts with `/` is a local target and needs `"adapters": ["netlify"]`.
- `pnpm check:aliases` validates the file and what every adapter can serve, without network.

## What each adapter does

| Adapter | `sync` | Who answers requests |
| --- | --- | --- |
| `netlify` | sends the hosts as the site's domain aliases and writes `_redirects` | Netlify |
| `caprover` | adds the missing custom domains to the CapRover app, turns SSL on, removes the ones no longer in the file | the Docker image: `CapRoverAdapter.handle` through `ServerSetup` |

Run one with `pnpm sync -- --adapter <name>` (needs the variables of `.env.example`). Netlify's sync runs in the Netlify build (`pnpm build`).

## Capabilities

| Capability | Netlify | CapRover |
| --- | --- | --- |
| `canProxy` | yes | yes |
| `canMatchPathParams` (`:name`, `*`) | yes | yes |
| `canServeLocalTargets` | yes | no |

`sync` and `check` fail with `UnsupportedAliasError` when an alias needs a capability its adapter lacks and does not list another adapter only.

## Adding a platform

1. Add its name to `AdapterName` (`Protocols/AliasProtocol.ts`) and to `ADAPTER_NAMES` (`Schemas/AliasSchema.ts`).
2. Write `src/Adapters/<Name>Adapter.ts` implementing `AdapterPort` (or `RuntimeAdapterPort`), with `static readonly CAPABILITIES`. Take the platform client through the constructor as a `*Port`, so tests use a double.
3. Reuse the core: `CapabilityUtil.assertServable` in `sync`, `ServeUtil.serve` in `handle`.
4. Register it in `Setup/AdapterSetup.ts` (the `Record` fails to compile until you do) and add its variables to `.env.example`.
5. Tests next to the adapter (`docs/test-standards.md`), then `pnpm check:changed`.
6. Update this file and `GLOSSARY.md`.
