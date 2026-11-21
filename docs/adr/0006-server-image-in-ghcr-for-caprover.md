# 0006. The redirect server is a Docker image in GHCR, and CapRover points at it

Status: accepted (2026-11-20)

## Context

Aliases that need proxying, or a host that is not on Netlify, need a process that answers requests. CapRover can build from a repository, but that moves the build onto the host, hides it from CI and makes a deploy depend on what the host has installed. zerod solved the same problem with an image in GHCR (ADR 0012 there).

## Decision

The release workflow builds the image from the `Dockerfile` at the root and pushes it to the GitHub Container Registry as `ghcr.io/<owner>/gbkel-redirects`, tagged with the version, `major.minor` and `latest`. CapRover deploys by image name and never builds. The server reads `domainAliases.json` from a URL and reloads it, so an alias change needs no release; only the custom domains need the CapRover API, which a workflow runs when the file changes.

## Consequences

- The artifact tested in CI is the one that runs in production, and a rollback is a deploy of an older tag.
- The package must be public, or CapRover needs a registry login with `read:packages` (`docs/deploying-with-caprover.md`).
- The image has no dependencies to install; Node strips the types itself (ADR 0004), so the Node version of the image is the only moving part.
- A new host needs its DNS pointed at CapRover before the domain sync can add it.
- The `Dockerfile` is part of the harness: a change to the server's imports can break it, and the CI job is what tells.
