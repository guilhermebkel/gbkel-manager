# 0004. TypeScript run by Node, no build step

Status: accepted (2026-11-20)

## Context

The repository was JavaScript. The harness is type-aware (Oxlint with type information, `tsc`, contract and type lint rules), which loses half its value on JavaScript. A build step would add a stage to the Netlify build, to the Docker image and to every script.

## Decision

Source is TypeScript with erasable syntax only (`erasableSyntaxOnly`, `verbatimModuleSyntax`), run directly by Node 22 through type stripping. `tsc --noEmit` is the type check. The harness scripts stay `.mjs`. A bundler is used only where the platform requires one (wrangler for Cloudflare Workers).

## Consequences

No `enum`, namespace or parameter properties, and relative or alias imports carry the `.ts` extension. Node 22 or later is required (`engines`, `.nvmrc`).
