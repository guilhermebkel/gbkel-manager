import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { ESLint } from "eslint";
import { afterAll, describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "..");
const WORK_DIR = mkdtempSync(join(ROOT, "lint-fixtures-"));
const MINUTE_MS = 60_000;
const RESTRICTED_IMPORT = "eslint(no-restricted-imports)";
const CONFIG_FILE = ".oxlintrc.json";
const LOCAL_PLUGIN = "./tooling/eslint-local-rules.mjs";
const UTIL_FILE = "src/Utils/MatchUtil.ts";
const ADAPTER_FILE = "src/Adapters/NetlifyAdapter.ts";
const TEST_FILE = "src/Utils/MatchUtil.test.ts";

const writeConfig = () => {
  const configText = readFileSync(join(ROOT, CONFIG_FILE), "utf8");
  const config = JSON.parse(configText);
  const localPluginPath = join(ROOT, LOCAL_PLUGIN);
  // Why: the fixtures sit in a throwaway folder inside the repo (so the JS plugins resolve) and are deleted after the run; the config copy needs the local plugin path made absolute.
  config.jsPlugins = config.jsPlugins.map((plugin) => plugin === LOCAL_PLUGIN ? localPluginPath : plugin);
  writeFileSync(join(WORK_DIR, CONFIG_FILE), JSON.stringify(config));
};

const writeFixture = (path, code) => {
  const file = join(WORK_DIR, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, code);
};

const runOxlint = (path) => {
  const configPath = join(WORK_DIR, CONFIG_FILE);
  const filePath = join(WORK_DIR, path);
  // Why: `--silent` suppresses pnpm engine/update notices on stdout so `result.stdout` stays valid JSON.
  const args = ["--silent", "exec", "oxlint", "--type-aware", "-c", configPath, "--format", "json", filePath];
  const result = spawnSync("pnpm", args, { cwd: ROOT, encoding: "utf8", shell: process.platform === "win32" });
  const report = JSON.parse(result.stdout);
  return report.diagnostics.map((diagnostic) => diagnostic.code);
};

writeConfig();
afterAll(() => {
  rmSync(WORK_DIR, { recursive: true, force: true });
});

// Why: each row is a file that breaks one rule that guards the layers, the independence of the adapters or the portability of the core, the path it sits at, and the rule id Oxlint names.
const FAILING_EXAMPLES = [
  ["process.env outside EnvSetup", ADAPTER_FILE, "export const read = () => process.env.SECRET;\n", "eslint(no-restricted-properties)"],
  ["a util that imports a higher layer", UTIL_FILE, "import { NetlifyAdapter } from \"#app/Adapters/NetlifyAdapter.ts\";\nexport const make = NetlifyAdapter;\n", RESTRICTED_IMPORT],
  ["an adapter that imports the setup", ADAPTER_FILE, "import { CliSetup } from \"#app/Setup/CliSetup.ts\";\nexport const make = CliSetup;\n", RESTRICTED_IMPORT],
  ["an adapter that imports another adapter", ADAPTER_FILE, "import { CapRoverAdapter } from \"#app/Adapters/CapRoverAdapter.ts\";\nexport const make = CapRoverAdapter;\n", RESTRICTED_IMPORT],
  ["a util that imports a node module", UTIL_FILE, "import { randomInt } from \"node:crypto\";\nexport const roll = () => randomInt(6);\n", RESTRICTED_IMPORT],
  ["a util that imports an IO library", UTIL_FILE, "import Netlify from \"netlify\";\nexport const make = Netlify;\n", RESTRICTED_IMPORT],
  ["a relative parent import", UTIL_FILE, "import { OtherUtil } from \"../Utils/OtherUtil.ts\";\nexport const make = OtherUtil;\n", RESTRICTED_IMPORT],
  ["the core reading process", UTIL_FILE, "export const read = () => process.cwd();\n", "eslint(no-restricted-globals)"],
  ["the core drawing a random number", UTIL_FILE, "export const draw = () => Math.random();\n", "eslint(no-restricted-properties)"],
  ["console in the core", UTIL_FILE, "export const log = () => { console.log(\"x\"); };\n", "eslint(no-console)"],
  ["a vitest matcher that asserts nothing exact", TEST_FILE, "import { expect, it } from \"vitest\";\nit(\"a\", () => { expect(1).toBeTruthy(); });\n", "vitest(no-restricted-matchers)"],
  ["a floating promise", ADAPTER_FILE, "export const run = async () => { Promise.resolve(1); };\n", "typescript(no-floating-promises)"],
  ["a fixed wait in a test", "src/Utils/Wait.test.ts", "export const pause = (page) => page.waitForTimeout(500);\n", "local(no-fixed-wait)"],
];

describe("pnpm lint, Oxlint side", () => {
  it.each(FAILING_EXAMPLES)("%s fails with the name of the rule", (_name, path, code, ruleId) => {
    writeFixture(path, code);
    const codes = runOxlint(path);
    expect(codes).toContain(ruleId);
  }, MINUTE_MS);

  it("a clean file passes", () => {
    writeFixture("src/Utils/CleanUtil.ts", "export const ONE = 1;\n");
    const codes = runOxlint("src/Utils/CleanUtil.ts");
    expect(codes).toStrictEqual([]);
  }, MINUTE_MS);

  it("an adapter may import the core through the app alias", () => {
    writeFixture(ADAPTER_FILE, "import { MATCH } from \"#app/Utils/MatchUtil.ts\";\nexport const VALUE = MATCH;\n");
    const codes = runOxlint(ADAPTER_FILE);
    // Why: the fixture sits outside any tsconfig, so the type-aware rules complain about the unresolved import; only the import restriction is under test.
    expect(codes).not.toContain(RESTRICTED_IMPORT);
  }, MINUTE_MS);
});

const eslint = new ESLint({ cwd: ROOT });
const ESLINT_FILE = "src/Setup/CliSetup.ts";

const runEslint = async (path, code) => {
  const [result] = await eslint.lintText(code, { filePath: join(ROOT, path) });
  return result.messages.map((message) => message.ruleId);
};

// Why: each row is a rule Oxlint cannot run (or runs differently), so ESLint keeps it and `pnpm lint` fails if either linter fails.
const ESLINT_EXAMPLES = [
  ["a boolean named without a prefix", ESLINT_FILE, "export const done = true;\nexport const check = (ready: boolean) => ready;\n", "@typescript-eslint/naming-convention"],
  ["a type that cannot be false", ESLINT_FILE, "export const check = (value: string) => value === \"a\" || value !== undefined;\n", "@typescript-eslint/no-unnecessary-condition"],
  ["a call nested three deep", ESLINT_FILE, "export const run = () => a(b(1, 2, 3), 2, 3);\n", "no-restricted-syntax"],
  ["a one-letter name", ESLINT_FILE, "export const run = (x: string) => x;\n", "id-length"],
  ["a condition inside a test", "src/Utils/MatchUtil.test.ts", "import { expect, it } from \"vitest\";\nit(\"a\", () => { if (Math.random() > 1) { expect(1).toBe(1); } });\n", "vitest/no-conditional-in-test"],
];

describe("pnpm lint, ESLint side", () => {
  it.each(ESLINT_EXAMPLES)("%s fails with the name of the rule", async (_name, path, code, ruleId) => {
    const ruleIds = await runEslint(path, code);
    expect(ruleIds).toContain(ruleId);
  }, MINUTE_MS);
});
