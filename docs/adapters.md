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
- A `to` that starts with `/` is a local target: the platform answers with one of the site's own files. Netlify serves its published folder; the CapRover image serves `/static/...`, `/pages/...` (a page without its extension is its `.html`), a folder listing for `/static/...` folders and `/redirects.html`, built on the spot from the loaded aliases. Anything else answers `404`.
- **Moving a host to CapRover is opt-in.** A host is managed on CapRover (DNS record in Cloudflare, custom domain in the app) only when one of its aliases lists `"caprover"` in `adapters`. Without the field, an alias is open to every adapter but its DNS stays where it is (Netlify). Listing only `["caprover"]` takes the alias off Netlify's `_redirects` too.
- `pnpm check:aliases` validates the file and what every adapter can serve, without network.

## What each adapter does

| Adapter | `sync` | Who answers requests |
| --- | --- | --- |
| `netlify` | sends the hosts as the site's domain aliases and writes `_redirects` | Netlify |
| `cloudflare` | a DNS step, not a server: creates or repoints a CNAME to `CLOUDFLARE_CNAME_TARGET` (no Cloudflare proxy) for each host an alias claims for `caprover`; never deletes a record | none |
| `caprover` | adds the claimed hosts to the CapRover app as custom domains, turns SSL on, removes the ones no longer claimed | the Docker image: `CapRoverAdapter.handle` through `ServerSetup` |

Run one with `node src/Setup/CliSetup.ts sync --adapter <name>` (needs the variables of `.env.example`). Order matters: `cloudflare` first, then `caprover`, because CapRover checks the DNS when it adds a domain; the `Sync domains` workflow does it in that order. Netlify's sync runs in the Netlify build (`pnpm build`).

The `cloudflare` step stops with the host named when a host is outside `CLOUDFLARE_ZONE`, or when the host already has a record that is not a CNAME (for example an `A` record): remove that one in Cloudflare yourself.

## Capabilities

| Capability | Netlify | CapRover |
| --- | --- | --- |
| `canProxy` | yes | yes |
| `canMatchPathParams` (`:name`, `*`) | yes | yes |
| `canServeLocalTargets` | yes | yes (only `static/`, `pages/` and the generated redirects page) |

`sync` and `check` fail with `UnsupportedAliasError` when an alias needs a capability its adapter lacks and does not list another adapter only.

## Adding a platform

1. Add its name to `AdapterName` (or, for a step that serves nothing like `cloudflare`, to `PlatformName`) (`Protocols/AliasProtocol.ts`) and to `ADAPTER_NAMES` (`Schemas/AliasSchema.ts`).
2. Write `src/Adapters/<Name>Adapter.ts` implementing `AdapterPort` (or `RuntimeAdapterPort`), with `static readonly CAPABILITIES`. Take the platform client through the constructor as a `*Port`, so tests use a double.
3. Reuse the core: `CapabilityUtil.assertServable` in `sync`, `ServeUtil.serve` in `handle`.
4. Register it in `Setup/AdapterSetup.ts` (the `Record` fails to compile until you do) and add its variables to `.env.example`.
5. Tests next to the adapter (`docs/test-standards.md`), then `pnpm check:changed`.
6. Update this file and `GLOSSARY.md`.
