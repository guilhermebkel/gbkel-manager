import { describe, expect, it } from "vitest";
import { CliSetup } from "#app/Setup/CliSetup.ts";

describe("CliSetup.parseArguments()", () => {
  it("reads the command and the adapter", () => {
    const parsed = CliSetup.parseArguments(["sync", "--adapter", "netlify"]);

    expect(parsed).toStrictEqual({ command: "sync", adapter: "netlify" });
  });

  it("leaves the adapter out when none is given", () => {
    const parsed = CliSetup.parseArguments(["check"]);

    expect(parsed).toStrictEqual({ command: "check" });
  });

  it.each([[[]], [["deploy"]], [["sync", "--adapter"]]])("fails with the usage for %j", (argv) => {
    expect(() => CliSetup.parseArguments(argv)).toThrow("Usage: node src/Setup/CliSetup.ts");
  });
});

describe("CliSetup.run()", () => {
  it("checks that every adapter can serve what the real alias file asks of it, without touching any platform", async () => {
    const status = await CliSetup.run(["check"]);

    expect(status).toBe(0);
  });
});
