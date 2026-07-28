import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const CLIENT_FILES = [
  "components/portfolio/PortfolioViewTabs.tsx",
  "components/portfolio/MultiCreateFlow.tsx",
];

describe("portfolio client boundaries", () => {
  it("does not import heavy engine modules in client components", () => {
    for (const file of CLIENT_FILES) {
      const abs = path.resolve(process.cwd(), file);
      const code = fs.readFileSync(abs, "utf8");
      expect(code.includes("value-engine/engine")).toBe(false);
      expect(code.includes("portfolio/service")).toBe(false);
      expect(code.includes("multi-company-runtime")).toBe(false);
    }
  });
});
