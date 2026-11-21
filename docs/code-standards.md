# Code standards

How code in this repository is written. `pnpm lint` enforces the rules marked **(lint)**; the rest are checked in review. When a rule and readability disagree, raise it in the PR instead of working around the rule.

**A rule that a tool can check is a tool, not a sentence.** When a rule here can be a lint rule, a type or a test, it becomes one (this repo's own rules live in `tooling/eslint-local-rules.mjs` and run in Oxlint as a JS plugin, ADR 0005); text is for what no tool can check. A written rule the agent keeps breaking is the sign it should move.

## Architecture

- **Layers (lint).** Inside `src/`, folders form layers and a layer imports only the ones below it: `Errors` (import nothing) < `Protocols` (types and ports) < `Utils` (pure static helpers, the matcher) < `Schemas` (validation of `domainAliases.json`) < `Generators` (pure builders of HTML) < `Adapters` (one platform each) < `Setup` (entry points and `EnvSetup`). The first five are the **core**. Import cycles fail `pnpm quality` (dpdm, `import type` ignored).
- **What each folder holds (one line each).** `Errors`: error classes, one per file. `Protocols`: types and `*Port` interfaces only; the `Adapter` contract is one. `Utils`: pure static helpers (the matcher, the serving of a request, capability checks); they import no Node module and use no `process`, timer or `Math.random` (lint and `scripts/architecture.test.mjs`). `Schemas`: validation of the alias file, returning typed data or throwing a core error. `Generators`: pure functions of data to a string (the pages of the static site); the file system stays in `Setup`. `Adapters`: code that makes one platform serve the aliases, and the only code that talks to that platform's API. `Setup`: starts something (the CLI, the redirect server, the site build) and reads the environment; no alias logic. A file goes in the folder that matches its job, never in the one that has room.
- **The core is pure (lint).** It imports no Node built-in and none of the IO libraries (`netlify`). Every adapter and every test can use it with no network, and a new runtime can reuse it as it is.
- **Adapters are independent (lint).** An adapter imports the core and its platform's library, never another adapter and never `Setup`. A platform is removed by deleting its adapter and its setup.
- **Capabilities, not surprises.** An adapter declares what it supports (`canProxy`, `canMatchPathParams`) and `sync` fails naming the alias when the file asks for more. A new capability is added to the `Adapter` port first, then each adapter answers it.
- **Libraries of the outside world have one home each.** The Netlify SDK is imported only by `NetlifyAdapter`, the CapRover API is called only by `CapRoverAdapter`, and so on; the rest of the code depends on the port.
- **Imports use the app alias and the real file name (lint).** `#app/Utils/MatchUtil.ts`, never `../` (ADR 0003). `./` stays out of `src/` by convention: use the alias there too.
- **Names say the folder (lint: `local/file-suffix`).** Every file inside a mapped folder of `src/` ends its name with the folder's name, singular, before the extension and before `.test`: `src/Adapters/NetlifyAdapter.ts`, `src/Utils/MatchUtil.test.ts`. A subfolder takes the suffix of the top folder. The map is `SUFFIX_BY_FOLDER` in `tooling/eslint-local-rules.mjs`. A new folder under `src/` needs its entry in the map (and a line in "What each folder holds") before its first file. Outside the rule: `index.ts`, non-code files, `scripts/`.
- **Classes, not loose functions, for behavior.** Utils are classes with static methods only. An adapter is a class that implements the `AdapterPort`, with its dependencies through the constructor. Runtime constants belong to the class that owns them as `static readonly` members.
- **One class per file, named after it (lint).** `max-classes-per-file`, `local/class-matches-file`.
- **A `<Name>Protocol.ts` file holds types only.** Use `type` by default; `interface` is only for the contract of a class, named `<Name>Port` (lint: `local/interface-for-contracts`).
- **Errors live in `src/Errors/` (lint).** One class per file, named after what went wrong and ending in `Error`. Anything that extends `Error` outside that folder fails lint (`local/error-location`).

## Naming

- **English everywhere.** Identifiers, messages, docs.
- **Casing (lint).** Variables, functions and parameters are `camelCase`. Types, interfaces and classes are `PascalCase`. Module-level and `static readonly` constants are `UPPER_CASE`. Discriminated-union kinds are `snake_case`.
- **Descriptive names (lint).** No single-letter identifiers, including loop indexes and callback parameters: `(alias) => ...`, not `(a) => ...`. A name says what the value is in this domain (`GLOSSARY.md`), never `data`, `item`, `value` or `obj` when something more specific exists.
- **Function names (lint).** A function, method or arrow function starts with a verb in base form as a whole camelCase word: `getHost`, `buildRedirects`, `resolveAlias`, never `hostOf`. The allowed verbs are `ALLOWED_VERBS` in `tooling/eslint-local-rules.mjs` (`local/verb-function-name`); add a real verb there when none fits. Predicates (`is`, `has`, `can`, `should`), constructors and getters are exempt.
- **Booleans (lint).** Start with `is`, `has`, `should`, `can`, `must`, `was` or `did`. Names are affirmative.
- **Maps and records (lint).** Every `Record` or `Map` is named `keyToValue`: `adapterNameToAdapter`, `MODE_TO_HANDLER`.
- **Units.** A number with a unit carries it in the name: `reloadIntervalMs`, `timeoutMs`.

## Functions

- **A function is an arrow function (lint: `local/arrow-function`, `prefer-arrow-callback`).** `const readAliases = async (): Promise<Alias[]> => { ... }`, never `function readAliases()`.
- **Only these functions stay `function`, each with its reason.** A generator (`function*`); a function that reads its own `this` or `arguments`; an overloaded function; a function with an assertion signature. A new exception needs a line here, never an ignore comment.
- **Class methods and object methods are not affected.**

## TypeScript

- **No `any` (lint).** Data from outside the program (the alias file, the environment, a request, an API response) is `unknown` and is parsed by a schema before use.
- **Erasable syntax only.** Node runs the `.ts` files itself (ADR 0004): no `enum`, no namespace, no parameter properties. Imports of types use `import type` (`verbatimModuleSyntax`).
- **No vague types for known shapes.** Declare the shape or a union of string literals instead of `object`, `Record<string, unknown>` or `string`.
- **Exhaustive unions (lint).** A `switch` over a union handles every member; prefer a `Record<Union, ...>` map, which the compiler checks for completeness.
- **`strict` and `noUncheckedIndexedAccess`** are on.

## Logic

- **Braces always (lint).**
- **No magic numbers (lint).** Every number other than `0`, `1` and `-1` is a named constant with its unit. Tests are exempt. HTTP status codes are named constants too.
- **Known values are typed, not `string` (lint: `local/known-keys`).** When every key of a `Record` or every item of an array or `Set` is written in the code, type it with a union, so a typo fails to compile.
- **Declare the type, then validate against it (lint: `local/no-inferred-type`).** No `typeof` of a constant to make a type.
- **Maps over comparing with fixed values (lint: `local/literal-dispatch`).** When code decides what to do by comparing a value with fixed strings, the decision is a `Record<Key, Handler>`.
- **Small functions (lint).** Cognitive complexity <= 15, nesting <= 3, parameters <= 5 (group the rest in an options object). Lint also rejects identical functions, duplicated branches, more than three `&&`/`||`/ternaries in one expression and assignments inside expressions.
- **Name a call before passing it on (lint).** If a call passed as an argument takes three or more arguments or receives another call, store its result in a named variable first.
- **Floating promises (lint).** Every promise is awaited or returned.
- **Time and randomness are inputs to the core.** Pass them in; the core never reads them.

## When lint rules collide

- **`as Type` against `!`.** Restructure instead: narrow with a guard that returns early (tests may use `!`).
- **Copies use the ES2023 methods** (`toSorted()`, `toReversed()`), not `[...array].sort()`.
- **A function is a `const` arrow, defined above its first use.**
- **Visitor keys in local rules are quoted** (`"IfStatement"(node)`).

## Boundaries and security

- **Environment variables (lint).** `process.env` is read only in `EnvSetup`, validated at startup. Adapters receive their settings as constructor arguments.
- **Validate at the edge.** `domainAliases.json`, the environment and every outside response are parsed before use. The core trusts its types.
- **A proxy is not an open relay.** The redirect server forwards only to the `to` of an alias it matched; the schema rejects a path parameter in the host of `to`, so a request can only change the path or the query of the target.
- **Secrets stay out.** Tokens and passwords come from the environment, never from the repository, and never go to a log (`no-console` outside `Setup`; `Setup` prints names and counts, not values).

## Before committing

Commit once per task, not per file. Before the commit, `pnpm check:changed` must pass. A `pnpm quality` finding means delete the dead code or extract the shared part, not add an ignore. While iterating, run only the relevant file (`pnpm exec vitest run <file>`).

## Dependencies

- **pnpm only.** Commit `pnpm-lock.yaml`; never `package-lock.json`.
- **The lockfile changes only with `package.json`.**
- **A new runtime dependency needs a reason** in the PR description. The core takes none.

## Backward compatibility

Code that exists only so an old stored shape or an old script keeps working carries a `// @legacy: <what and why>` comment next to it, so it can be found with a search and removed when the old data is gone. Anything else changes without a compatibility path.

## Formatting and comments

- **Formatting (lint).** `@stylistic` (an Oxlint JS plugin): 2-space indent, double quotes, semicolons, trailing commas in multi-line literals, lines up to 120 characters. `pnpm lint:fix` applies it.
- **No alignment (lint).** Never add spaces to align values into columns.
- **No comments by default (lint).** A comment stays only when the code guards a rule it doesn't show and someone could change it without knowing. It starts with `Why:` and names the rule. Lint (`local/comment-marker`) rejects any other comment except tool directives.
- **A comment sits on the line it explains (lint).** Right above the statement where the rule happens, never above a whole function, class or type, never as a file header, never in a `<Name>Protocol.ts` file (`local/comment-placement`).
- **Delete what the code already says; keep the reason true (review).**
