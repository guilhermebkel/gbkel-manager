# 0007. Cloudflare points the DNS, and only claimed hosts move

Status: accepted (2026-11-21)

## Context

CapRover checks that a host resolves to it when the host is added as a custom domain, so the DNS has to exist first. Setting it by hand for every new alias is the step most likely to be forgotten. At the same time almost every alias is open to both Netlify and CapRover, and the DNS record decides which one answers: a sync that touched every host would move everything off Netlify at once, and registering hosts whose DNS is still on Netlify would fail.

## Decision

A `CloudflareAdapter` creates or repoints a CNAME to a configured target, with the Cloudflare proxy off (CapRover issues its own certificate), through a token. It is a DNS step, not a server, so it is a `PlatformName` and not an `AdapterName`. It never deletes a record and refuses a host that has a record of another type or lies outside the configured zone.

A host moves only when an alias names `caprover` in its `adapters` list (a claim). The Cloudflare step and the CapRover domain sync both read claims, never the aliases that are merely open to every adapter. The `Sync domains` workflow runs Cloudflare first, then CapRover with a few retries while the record propagates.

## Consequences

- Migrating a host is one edit to `domainAliases.json`; nothing moves by accident.
- A host outside the Cloudflare zone cannot be moved by the workflow; its DNS stays manual.
- Records are never removed, so a host taken off CapRover keeps its CNAME until someone changes it.
- The token only needs `Zone > DNS > Edit` on one zone.
