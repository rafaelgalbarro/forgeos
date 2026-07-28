import { describe, expect, it } from "vitest";
import { getPortfolioTabHref } from "../tab-routes";

describe("portfolio links", () => {
  it("resolves canonical tab routes", () => {
    expect(getPortfolioTabHref("pf-1", "OVERVIEW")).toBe("/portfolio/pf-1");
    expect(getPortfolioTabHref("pf-1", "VENTURES")).toBe("/portfolio/pf-1/ventures");
    expect(getPortfolioTabHref("pf-1", "VALUE")).toBe("/portfolio/pf-1/value");
    expect(getPortfolioTabHref("pf-1", "EXECUTIONS")).toBe("/portfolio/pf-1/executions");
    expect(getPortfolioTabHref("pf-1", "RESOURCES")).toBe("/portfolio/pf-1/resources");
  });
});
