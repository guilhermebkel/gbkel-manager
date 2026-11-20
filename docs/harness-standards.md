# Harness standards

The harness is `AGENTS.md`, the standards docs, lint rules, check scripts, `package.json` commands, CI, templates (pull request and issue), and `docs/agents/`.

How to change it: each rule is one line; **(review)** is answered in review. It was ported from zerod, which was ported from tocomevidencia, and adapted (ADR 0001).

**A tool before a sentence (review).** A new pattern is enforced by a type, a lint rule or a script first; it becomes a line of text only when no tool can express it. e.g. commands run `scripts/ensure-deps.mjs` before they start, instead of telling agents to run `pnpm install` by hand.

## Classes and where the fix goes

Each finding is exactly one class; the class picks the fix.

| Class | When | Fix |
| --- | --- | --- |
| Rule ignored | The harness already says it and the agent still does the opposite | A check; never more text |
| Partial or outdated | The rule exists but is incomplete, ambiguous or false today | Fix the line where it lives |
| Missing | Nothing covers it | Add it in the piece that does the work, not in `AGENTS.md`, unless it applies to every session |
| Structure change | A request repeats (a skill), a fixed sequence is rediscovered (a script), a piece is never used (remove it), a large always-loaded piece is needed only sometimes (split it) | Change the structure, not a longer rule |
| Out of scope | The cause is outside the harness (a product tool or service) | A recommendation only |
| Already handled | An open issue or pull request covers it | Listed with its number; not suggested again |

- **Placement order (review).** Take the first of these that can express the rule: a type or compiler option; a lint rule (built-in, then local in `tooling/eslint-local-rules.mjs` with its test), set at today's worst case when it is a limit; a script or test that `pnpm check` runs; a template or checklist; a line in `AGENTS.md` or a standards doc marked **(review)** with the reason no tool can check it; an ADR when it is a decision with a cost.
- **Cheapest adequate fix (review).** Delete or tighten before adding. A script before a longer prompt. Rarely needed detail out of `AGENTS.md`.
- **Conflict is a finding (review).** Two rules for the same thing are fixed by keeping the one where the work is done and removing the other. A piece that works only because another says something specific is coupling, and also a finding.
- **A rule about a layer, an adapter boundary or the core's portability has a failing example (lint test).** Add it to `scripts/lint-rules.test.mjs` with the rule.
- **A fix found here that also applies to zerod is carried back to it (review).** The two harnesses are copies and drift otherwise.
