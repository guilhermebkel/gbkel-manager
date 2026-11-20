import { describe, it, expect } from "vitest";
import { isSharedRoot, planCheck } from "./check-changed.mjs";

const UTIL_PATH = "src/Utils/MatchUtil.ts";

describe("planCheck()", () => {
  it("checks only the changed files when nothing shared changed", () => {
    expect(planCheck({ base: "abc", changedPaths: [UTIL_PATH, "src/Adapters/NetlifyAdapter.ts"] })).toStrictEqual({ kind: "changed", base: "abc" });
  });

  it("runs the full check and says why when the base cannot be resolved", () => {
    expect(planCheck({ base: null, changedPaths: [] })).toStrictEqual({ kind: "full", reason: "origin/main could not be resolved" });
  });

  it.each(["package.json", "pnpm-lock.yaml", "tsconfig.json", "eslint.config.mjs", ".oxlintrc.json", "knip.json", "vitest.config.mjs", "lint-staged.config.mjs", "scripts/lint.mjs", "src/Protocols/AliasProtocol.ts", "tooling/eslint-local-rules.mjs", ".github/workflows/ci.yml"])(
    "runs the full check when %s changed",
    (path) => {
      expect(planCheck({ base: "abc", changedPaths: [UTIL_PATH, path] })).toStrictEqual({ kind: "full", reason: `${path} is a shared root` });
    },
  );
});

describe("isSharedRoot()", () => {
  it("leaves ordinary source files out", () => {
    expect(isSharedRoot("src/Utils/Protocolsish.ts")).toBe(false);
    expect(isSharedRoot("src/Adapters/package.json.ts")).toBe(false);
    expect(isSharedRoot(UTIL_PATH)).toBe(false);
  });
});
