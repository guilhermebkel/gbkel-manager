# gbkel-manager

The words this repository uses.

## Language

**Alias**:
One entry of `domainAliases.json`: a `from` (a host with an optional path pattern), a `to` (a URL), a `statusCode` and an optional `mode`. The unit every adapter turns into something its platform understands.
_Avoid_: redirect (when proxying is possible too), rule, route

**From**:
The host and an optional path pattern of an alias: `linkedin.guilherr.me`, or `seo.guilherr.me/:url/:device`. A segment that starts with `:` is a path parameter.

**Path parameter**:
A `:name` segment in `from` whose value is substituted into every `:name` in `to`. Netlify did this implicitly; the matcher defines it once for every adapter.

**Mode**:
What happens to a matching request. `redirect` (the default) answers with `statusCode` and a `Location`. `proxy` fetches `to` and returns its response while the visitor stays on the original URL. Only adapters that run code at request time support `proxy`.

**Core**:
The pure layers (`Errors`, `Protocols`, `Schemas`, `Utils`, `Generators`). They run anywhere: Node, the Docker image, a Cloudflare Worker.

**Matcher**:
The core function that takes a host and a path and returns the alias that wins and the final location, or nothing. Written once, used by every runtime adapter.

**Adapter**:
The code that makes one platform serve the aliases. Two kinds: a **config-generating** adapter writes configuration or calls an API once (Netlify, CapRover domains), and a **runtime** adapter answers requests with the matcher (Docker server, Cloudflare Worker).

**Capability**:
What an adapter declares it can do (`canProxy`, `canMatchPathParams`). An alias that needs an unsupported capability makes `sync` fail with the alias named.

**Sync**:
Making a platform match `domainAliases.json`: Netlify domain aliases and `_redirects`, CapRover custom domains with SSL, Cloudflare routes.

**Static site**:
`static/` and `pages/`, published at `static.guilherr.me`, plus the generated index pages and the list of redirects at `redirects.guilherr.me`.

**Harness**:
`AGENTS.md`, the standards docs, the lint rules, the check scripts, CI and the templates. Ported from zerod (ADR 0001).
