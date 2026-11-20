# Deploying with CapRover

How a release of the redirect server reaches CapRover. The server is a Docker image in the GitHub Container Registry; CapRover only points at it (ADR 0006).

## What a release publishes

Run the `Release` workflow by hand (Actions, Release, Run workflow, on `main`) and pick `patch`, `minor` or `major`. In one run it:

1. runs the full `pnpm check`;
2. bumps `version` in `package.json`, commits `release: vX.Y.Z [skip ci]` to `main` and pushes the tag `vX.Y.Z`;
3. creates the GitHub release (generated notes) and pushes `ghcr.io/<owner>/gbkel-redirects` with the tags `1.2.3`, `1.2` and `latest`;
4. creates or updates the CapRover app (`CAPROVER_APP`): one instance, container port `3000`, force HTTPS, `ALIASES_URL` set to the raw `domainAliases.json` of `main`; then deploys that version.

The version commit is pushed by `github-actions[bot]`, so a rule that blocks direct pushes to `main` has to let that bot through. Every pull request also builds the image (without pushing it), starts it and checks `/healthz` and one redirect, so a broken `Dockerfile` fails the PR and not the release.

## Settings of the repository

| Where | Name | Value |
| --- | --- | --- |
| Variable | `CAPROVER_URL` | the dashboard, `https://captain.<root domain>` |
| Variable | `CAPROVER_APP` | the app name, for example `gbkel-redirects` |
| Secret | `CAPROVER_PASSWORD` | the CapRover password |

The package starts private on GitHub: make it public (Packages, the package, Package settings, Change visibility) or give CapRover a registry login with `read:packages`.

## Changing an alias

Edit `domainAliases.json` and merge to `main`. Two things follow, with no release:

- the server reloads the file from `ALIASES_URL` every `ALIASES_RELOAD_SECONDS` (300 by default), so a new redirect works within five minutes; a reload that fails keeps the previous aliases;
- the `Sync CapRover domains` workflow runs when the file changes and registers new hosts as custom domains of the app (and turns SSL on), and removes the hosts that left the file.

Point the DNS of a new host to the CapRover machine **before** merging: CapRover checks it when the domain is added, and the sync fails if it does not resolve yet. Run the workflow again by hand after fixing the DNS.

## The server

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3000` | the port in the container (CapRover's container port) |
| `HOST` | `0.0.0.0` | the address it listens on |
| `ALIASES_URL` | none | where to download the alias file; when empty, the file baked into the image is used |
| `ALIASES_FILE` | `domainAliases.json` | the file read at start, and the fallback |
| `ALIASES_RELOAD_SECONDS` | `300` | how often `ALIASES_URL` is read again; `0` turns the reload off |

`/healthz` answers `200` for any host that no alias claims. An unknown host gets `404`; an origin that is down gets `502` with an empty body. The server runs locally with `node src/Setup/ServerSetup.ts`, and `curl -H "Host: linkedin.guilherr.me" http://localhost:3000/` shows a redirect.

## Rolling back

Deploy an older tag in CapRover (App Configs, Deploy via image name: `ghcr.io/<owner>/gbkel-redirects:1.2.3`).
