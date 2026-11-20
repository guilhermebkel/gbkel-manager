import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "..");
const SRC = join(ROOT, "src");
const NODE_IMPORT = /from\s+["'](?:node:|fs["']|path["']|os["']|net["']|http["']|https["']|child_process["'])/;
const CORE_LAYERS = ["Errors", "Protocols", "Schemas", "Utils", "Generators"];

const listSourceFiles = (dir) => {
  const found = [];
  if (!existsSync(dir)) {
    return found;
  }
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      found.push(...listSourceFiles(path));
    } else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) {
      found.push(path);
    } else {
      continue;
    }
  }
  return found;
};

describe("the core layers are runtime-agnostic", () => {
  it.each(CORE_LAYERS)("%s imports no Node module, so the same code can run in a Cloudflare Worker", (layer) => {
    const offenders = listSourceFiles(join(SRC, layer)).filter((file) => NODE_IMPORT.test(readFileSync(file, "utf8")));

    expect(offenders).toStrictEqual([]);
  });

  it("the Cloudflare Workers adapter imports no Node module", () => {
    const file = join(SRC, "Adapters", "CloudflareWorkersAdapter.ts");
    const offenders = [file].filter((path) => existsSync(path) && NODE_IMPORT.test(readFileSync(path, "utf8")));

    expect(offenders).toStrictEqual([]);
  });
});
