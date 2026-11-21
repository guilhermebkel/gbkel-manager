# gbkel-manager

The words this repository uses.

## Language

**Alias**:
One entry of `domainAliases.json`: a `from` (a host with an optional path pattern), a `to` (a URL or a local path), a `statusCode` and an optional `adapters` list. The unit every adapter turns into something its platform understands.
_Avoid_: redirect (when proxying is possible too), rule, route

**From**:
The host and an optional path pattern of an alias: `linkedin.guilherr.me`, `seo.guilherr.me/:url/:device` or `blog.guilherr.me/*`. A host with no path matches only `/`, as a Netlify rule with no path does. A trailing slash is ignored.

**Path parameter**:
A `:name` segment in `from` that matches one path segment; its value goes into every `:name` in `to`. A final `*` matches the rest of the path and goes into `:splat`. The matcher defines this once for every adapter; a path parameter is never allowed in the host of `to`.

**Mode**:
What happens to a matching request, taken from the `statusCode`: `200` is a **proxy** (the target is fetched and the visitor stays on the original URL, Netlify's rewrite), a `301`, `302`, `303`, `307` or `308` is a **redirect** with that status. The query string of the request is kept on the target.

**Local target**:
A `to` that starts with `/`: the platform answers with one of its own files (`/static/:splat`, `/redirects.html`). Only Netlify can, so these aliases carry `"adapters": ["netlify"]`.

**Adapters (field)**:
The optional list of adapters that serve an alias (`netlify`, `caprover`). Without it, every adapter serves the alias. An adapter ignores the aliases that name only others.

**Claim**:
An alias *claims* a host for an adapter when its `adapters` list names it. Only claims move a host: `cloudflare` and the CapRover domain sync look at claimed hosts, so an alias with no `adapters` field never changes any DNS record or CapRover domain.

**Core**:
The pure layers (`Errors`, `Protocols`, `Utils`, `Schemas`, `Generators`). They import no Node built-in and do no IO, so every adapter shares them and tests need no network.

**Matcher**:
The core code (`MatchUtil`) that takes a host, a path and a query string and returns the first alias in file order that matches, with the final location, or nothing.

**Adapter**:
The code that makes one platform serve the aliases. `NetlifyAdapter` writes `_redirects` and the Netlify domain aliases; the platform redirects by itself. `CapRoverAdapter` is both: its `handle` answers requests inside the Docker image with the matcher, and its `sync` registers the custom domains of the CapRover app.

**Capability**:
What an adapter declares it can do (`canProxy`, `canMatchPathParams`, `canServeLocalTargets`). An alias that needs one the adapter lacks, and is not restricted away from it, makes `sync` and `check` fail naming the alias.

**Sync**:
Making a platform match `domainAliases.json`: the Netlify domain aliases and `_redirects`; the Cloudflare CNAME of each claimed host; or the CapRover custom domains with SSL (adding the missing claimed ones, removing the ones no longer claimed). Cloudflare runs before CapRover.

**Check**:
`pnpm check:aliases`: validate the file and the capabilities of every adapter, with no network.

**Redirect server**:
`ServerSetup`, the HTTP server the Docker image runs. It reads the aliases from `ALIASES_URL` (reloaded every few minutes) or from `ALIASES_FILE`, and answers `/healthz` for any host that no alias claims.

**Static site**:
`static/` and `pages/`, published at `static.guilherr.me`, plus the generated index pages of each folder and the list of redirects at `redirects.guilherr.me`.

**Harness**:
`AGENTS.md`, the standards docs, the lint rules, the check scripts, CI and the templates. Ported from zerod (ADR 0001).
