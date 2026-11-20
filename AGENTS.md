# gbkel-manager

The repository that manages my domains: domain aliases (redirects and proxies) served by an **adapter** (Netlify, or CapRover running a Docker image), and the static files at `static.guilherr.me`. Vocabulary is in `GLOSSARY.md`; decisions are in `docs/adr/`.

## Layout

One package, pnpm, Node 22, TypeScript run by Node itself (type stripping, no build step; ADR 0004). `domainAliases.json` is the single source of truth: every adapter reads it through the core.

`src/` is split in layers; a layer imports only the ones below it (`#app/<Folder>/<File>.ts`, ADR 0003):

- `Errors`, `Protocols`, `Utils`, `Schemas`, `Generators`: the **core**. Pure: no Node built-in, no `process`, no IO, so every adapter shares it and tests need no network (ADR 0002). `Protocols` are types and `*Port` interfaces (the `Adapter` contract lives here); `Utils` has the matcher (`MatchUtil`: host, path, `:param`, `*`) and the serving logic (`ServeUtil`: redirect or proxy); `Schemas` validate `domainAliases.json`; `Generators` build the HTML of the static site.
- `Adapters`: `NetlifyAdapter` (domains and `_redirects`) and `CapRoverAdapter` (`handle` answers requests inside the Docker image, `sync` registers the app's custom domains through `CapRoverApiAdapter`). An adapter never imports another adapter. Each declares its capabilities (`canProxy`, `canMatchPathParams`, `canServeLocalTargets`); an alias it cannot honor is an error at `sync`/`check`, not a surprise in production.
- `Setup`: entry points (`CliSetup`, `ServerSetup` for the image, `SiteSetup`) and `EnvSetup`, the only place that reads `process.env`.

Other folders: `static/` (published assets, outside lint), `pages/` (static HTML), `scripts/` (harness scripts), `tooling/` (our lint rules), `docs/`, `.github/`.

Every file in a mapped folder ends its name with the folder's name, singular (`NetlifyAdapter.ts`; lint `local/file-suffix`). One class per file. Tests sit next to the file they test (`*.test.ts`).

## Commands

    nvm use            # Node 22
    pnpm ensure-deps   # pnpm install when package.json or the lockfile changed
    pnpm test          # Vitest: src, scripts and tooling
    pnpm test:changed  # tests related to files changed against origin/main
    pnpm typecheck     # tsc --noEmit
    pnpm lint          # Oxlint (type-aware) and a minimal ESLint, in parallel
    pnpm lint:fix
    pnpm quality       # knip, jscpd, dpdm (import cycles)
    pnpm check:changed # what the branch changed against origin/main (run before a commit)
    pnpm check         # everything (CI runs it, split in parallel jobs)
    pnpm build         # the Netlify build: sync the aliases, then generate the static site pages

## How to act on a task

| When | Read | Run |
| --- | --- | --- |
| Starting a session | `README.md` | `nvm use`, `pnpm ensure-deps` |
| Given a GitHub issue number | `docs/agents/issue-tracker.md` | `gh issue view <n> --comments` |
| Triage labels on an issue | `docs/agents/triage-labels.md` | none |
| Domain terms or an ADR | `docs/agents/domain.md`, `GLOSSARY.md`, `docs/adr/` | none |
| Writing or changing code | `docs/code-standards.md` | none |
| Writing or changing tests | `docs/test-standards.md` | `pnpm test:changed` |
| Adding or changing an adapter, or an alias | `docs/adapters.md` | `pnpm check:aliases` |
| Before committing | `docs/code-standards.md` ("Before committing"), `.github/PULL_REQUEST_TEMPLATE.md` | `pnpm check:changed` |
| Full verification (CI gate) | `.github/PULL_REQUEST_TEMPLATE.md` | `pnpm check` |
| Changing the harness | `docs/harness-standards.md` | `pnpm check:changed` |
| Writing or moving docs | `docs/docs-standards.md` | none |
| Releasing the image or deploying to CapRover | `docs/deploying-with-caprover.md` | none |

## Rules

- Commit once per task, after a clean `pnpm check:changed`; CI runs the full `pnpm check` as the gate. Never raise a limit or add an ignore to pass.
- Start new work on a branch from `main` and open a pull request; `.github/PULL_REQUEST_TEMPLATE.md` has the checklist.
- Branch names are `<type>/<short-name>` in lowercase kebab-case: `feat` (new behavior), `fix` (bug fix) or `chore` (anything else). For issue work the name starts with the issue number: `feat/<n>-short-slug`.
- Code, tools, docs and ADRs are in English.
- `domainAliases.json` is the contract. A new field or behavior is added to the schema first, then the matcher, then each adapter says whether it supports it (`docs/adapters.md`).
- The core stays portable: it imports no Node built-in (lint, `scripts/architecture.test.mjs`). Anything that needs the file system, the network or `process` is an adapter or a setup.
- `process.env` is read only in `src/Setup/EnvSetup.ts`. Secrets (Netlify and CapRover tokens and passwords) are never logged or committed; `.env` is ignored.
- Code that keeps an old stored shape or an old script working carries a comment with `@legacy`. Nothing else gets backward compatibility. Remove it when the old data is gone.
- When behavior or vocabulary changes, update `GLOSSARY.md`, the docs or an ADR in the same PR.
- The Kindle workflows under `.github/workflows/kindle-*.yml` and `kindlefy-local-database.json` are not part of this harness: leave them alone.
