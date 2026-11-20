import { describe, expect, it } from "vitest";
import config, { buildLintCommand, buildQualityCommand, buildRelatedTestsCommand, buildTypecheckCommand, getRelativePaths } from "./lint-staged.config.mjs";

const CWD = process.cwd().replaceAll("\\", "/");
const UTIL = `${CWD}/src/Utils/MatchUtil.ts`;
const UTIL_TEST = `${CWD}/src/Utils/MatchUtil.test.ts`;

describe("lint-staged config", () => {
  it("lints the changed files without --fix", () => {
    expect(buildLintCommand([UTIL, UTIL_TEST])).toBe(`node scripts/lint.mjs --max-warnings=0 "${UTIL}" "${UTIL_TEST}"`);
  });

  it("runs the tests that import the changed files", () => {
    expect(buildRelatedTestsCommand([UTIL])).toBe(`vitest related --run --passWithNoTests "${UTIL}"`);
  });

  it("typechecks the whole project with no file arguments", () => {
    expect(buildTypecheckCommand()).toBe("pnpm typecheck");
  });

  it("runs the whole-project quality tools once for source changes", () => {
    expect(config["**/*.{ts,mjs}"]).toContain(buildQualityCommand);
  });

  it("makes paths relative to the working directory", () => {
    expect(getRelativePaths(CWD, [UTIL])).toStrictEqual(["src/Utils/MatchUtil.ts"]);
  });
});
