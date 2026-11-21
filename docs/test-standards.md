# Test standards

How tests in this repository are written. `pnpm lint` enforces the rules marked **(lint)**, through Oxlint's Vitest rules (and `@vitest/eslint-plugin` for `no-conditional-in-test`) and the rules in `docs/code-standards.md`, which apply to tests too; the rest are checked in review. Every rule here serves one of two questions: would this test fail if the code broke, and is it testing the real code?

## Where tests live

- **Next to the code.** A test lives beside the file it tests and shares its name (e.g. `MatchUtil.ts` -> `MatchUtil.test.ts`). There is no `test/` folder. Harness tests are `scripts/*.test.mjs` and `tooling/*.test.mjs`.
- **The outer describe names what is tested (lint).** Every test of a class sits under a top-level `describe("ClassName.method()")`: the class the file tests and the public method the tests go through. Situations go in describes inside it, worded as a context (`describe("when the host has a path")`). Lint (`local/describe-target`) checks that the class is the file's and that the method exists and is public. A private method is tested through the public one that calls it.
- **Through the highest seam.** Test behavior through the adapter's `sync` and `handle`, and through the matcher. Test a lower helper directly only for logic with many cases (path patterns).
- **Every new behavior brings its test.** Each new adapter, capability, schema field or output path gets a test, with a fake secret where output is involved.

## Which level

Many fast low-level tests, few that start a real server. Pick the lowest level that can fail for the behavior you are adding.

- **Core (`Utils`, `Schemas`, `Generators`).** Pure unit tests with literals worked out by hand. Every alias in `domainAliases.json` that has a path parameter has a test of its own.
- **Config-generating adapters.** Test the generated content (`_redirects`, the domain list sent to the API) and the call made to a fake client.
- **The CapRover adapter.** `handle` is tested with `Request` objects and a fake upstream; `sync` with a fake CapRover client; the redirect server (`ServerSetup`) with a real HTTP server on port 0 and a real client, the proxy target being a second local server.
- **A bug found at a high level** is first reproduced in a lower-level test, then fixed.

## Reliable tests

- **Wait for the condition, never for time (lint).** `local/no-fixed-wait` rejects `setTimeout` in tests. Use `vi.waitFor`, `expect.poll` or a fake timer.
- **Ports are 0.** A test server listens on port 0 and reads the port back.
- **Close what you open.** A server or a client left open in a test is a bug: close it in `afterEach`.
- **No network.** Tests never reach Netlify, CapRover or the public internet: the platform client is a double passed in through the constructor.

## What a test checks

- **Name the break.** Before writing the body, name the change to the code that should make the test fail. If you can't name one, the test checks nothing. A test that fails only when a constant or a message changes is a change detector.
- **Expected values come from outside the code.** Write them as literals worked out by hand from the fixture, never computed with the code under test or its constants.
- **Exact assertions (lint).** `toStrictEqual`, not `toEqual`. No `toBeDefined`, `toBeTruthy` or `toBeFalsy`. `toThrow` names the message; calls are checked with their arguments.
- **No vacuous passes.** An assertion that something never appears passes on empty output too: first assert there was something to check.
- **One behavior per test, named by the behavior,** in the domain's words (`GLOSSARY.md`): "keeps the visitor's path parameters in the final location", "refuses to proxy a host that is not in the file".

## Test code stays simple

- **No logic in the test body (lint).** No `if` or `try` deciding which assertion runs. Cases that differ only in data are rows of `it.each`.
- **Same rules as the code (lint).** Complexity, nesting, parameters, nested calls and duplication apply to tests. Exemptions: magic numbers, external key spelling, `!` and `process.env`.
- **Clean structure (lint).** No skipped, focused, commented-out or duplicated tests; hooks at the top of their block.

## Real code, doubles only at the edges

- **Run the real thing.** Real matcher, real schemas, a real local HTTP server. Don't mock this repository's own modules: if a test needs that, the seam is wrong.
- **Doubles only where the process meets the outside:** a platform client (Netlify, CapRover), the file system when a path is not the point, the clock. Assert what the code did with them.
- **Production code has no test-only methods.**

## Before finishing: the mutation check

Go through the code you changed and imagine the realistic mistakes: a wrong status code, a path parameter dropped, a host matched by suffix, a proxy to an unlisted URL, a secret in output, an off-by-one in a pattern. Some test should fail for each. When none would, add or fix the test before committing.

## The harness tests

The lint rules are tested in `scripts/lint-rules.test.mjs` (one failing example per rule that guards a layer, an adapter boundary or the core's portability) and `tooling/eslint-local-rules.test.mjs`. `scripts/architecture.test.mjs` checks that the core imports no Node module.
