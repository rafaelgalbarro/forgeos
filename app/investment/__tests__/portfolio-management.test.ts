import { describe, expect, it } from "vitest";
import {
  historicalVarPct,
  metricFromNullable,
  returnsToEquityCurve,
} from "@/lib/investment/portfolio-management-snapshot";

describe("portfolio management helpers", () => {
  it("returns NO_DATA-equivalent null for VaR with insufficient series", () => {
    expect(historicalVarPct([])).toBeNull();
    expect(historicalVarPct([0.01, -0.02, 0.01])).toBeNull();
  });

  it("computes historical VaR from return series", () => {
    const returns = [-0.05, -0.02, -0.01, 0, 0.01, 0.02, 0.03, 0.01, -0.03, 0.015];
    const var95 = historicalVarPct(returns, 0.95);
    expect(var95).not.toBeNull();
    expect(var95!).toBeGreaterThan(0);
  });

  it("builds equity curve without inventing points from empty returns", () => {
    expect(returnsToEquityCurve([])).toEqual([]);
    const curve = returnsToEquityCurve([0.01, -0.02, 0.03]);
    expect(curve.length).toBe(4);
    expect(curve[0]?.equity).toBe(100);
  });

  it("labels DEMO-derived metrics as ESTIMATED", () => {
    const metric = metricFromNullable("Demo value", 100, "CURRENCY", 2, undefined, "ESTIMATED");
    expect(metric.status).toBe("ESTIMATED");
    expect(metric.status).not.toBe("MEASURED");
  });
});

describe("portfolio management API route", () => {
  it("exports GET handler as ANALYSIS_ONLY surface", async () => {
    const mod = await import("../../api/investment/portfolio/route");
    expect(typeof mod.GET).toBe("function");
  });
});

describe("portfolio page and dashboard", () => {
  it("exports portfolio page and management dashboard", async () => {
    const page = await import("../portfolio/page");
    const dash = await import("@/components/investment/PortfolioManagementDashboard");
    const charts = await import("@/components/investment/portfolio-allocation-charts");
    expect(typeof page.default).toBe("function");
    expect(typeof dash.PortfolioManagementDashboard).toBe("function");
    expect(typeof charts.AllocationPieChart).toBe("function");
    expect(typeof charts.AllocationTreemap).toBe("function");
    expect(typeof charts.AllocationHeatmap).toBe("function");
    expect(typeof charts.AllocationTimeline).toBe("function");
  }, 30_000);
});
