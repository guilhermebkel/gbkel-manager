# 0001. The harness comes from zerod

Status: accepted (2026-11-20)

## Context

An agent can only change code safely when lint, types, tests and docs reject a wrong change quickly. This repository had none of that: a few CommonJS scripts, no tests. zerod already has such a harness, itself ported from tocomevidencia.

## Decision

Port its structure (`AGENTS.md` as an index, standards docs, Oxlint plus a minimal ESLint, local rules, knip, jscpd, dpdm, Vitest, `check:changed`, parallel CI jobs, templates) and adapt it to a single-package repository. Drop what is specific to the game, React, Playwright and the web app.

## Consequences

The rules and scripts are a copy that can drift from the original. A fix found here is worth carrying back to zerod. `static/` (served browser assets, one of them a vendor snippet) is outside lint: it is published as it is and is not source code of this project.
