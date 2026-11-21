# 0005. Oxlint with a minimal ESLint

Status: accepted (2026-11-20)

## Context

ESLint with type information is slow, and an agent runs lint many times per task. zerod solved it with Oxlint running nearly every rule (ADR 0006 there).

## Decision

Oxlint (type-aware, with JS plugins) runs nearly every rule, including the local rules. ESLint runs only what Oxlint cannot: the naming convention, `no-unnecessary-condition`, `prefer-optional-chain`, `id-length`, `no-restricted-syntax` and the vitest conditional rule. `scripts/lint.mjs` runs both in parallel.

## Consequences

Two configs to keep in step. A rule moves to Oxlint when Oxlint supports it. `.oxlintrc.json` was generated once from zerod's rule set and is edited by hand now; import groups use `**` because `*` stops at one path segment. The layer overrides in it are the order of ADR 0003.
