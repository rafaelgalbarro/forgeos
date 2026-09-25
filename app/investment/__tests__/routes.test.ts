import { describe, expect, it } from "vitest";

describe("investment product routes", () => {
  it("exports layout with product shell", async () => {
    const layout = await import("../layout");
    expect(typeof layout.default).toBe("function");
  }, 30_000);

  it("exports overview page component", async () => {
    const mod = await import("../page");
    expect(typeof mod.default).toBe("function");
  }, 30_000);

  it("exports loading and error boundaries", async () => {
    const loading = await import("../loading");
    const error = await import("../error");
    expect(typeof loading.default).toBe("function");
    expect(typeof error.default).toBe("function");
  });

  it("exports all investment primary and legacy sub-route pages", async () => {
    const pages = await Promise.all([
      import("../orders/page"),
      import("../portfolio/page"),
      import("../markets/page"),
      import("../screener/page"),
      import("../opportunities/page"),
      import("../signals/page"),
      import("../ai-committee/page"),
      import("../committee/page"),
      import("../risk/page"),
      import("../news/page"),
      import("../calendar/page"),
      import("../research/page"),
      import("../strategies/page"),
      import("../strategy/page"),
      import("../strategy-lab/page"),
      import("../scanner/page"),
      import("../alpha/page"),
      import("../backtesting/page"),
      import("../paper/page"),
      import("../shadow/page"),
      import("../live/page"),
      import("../performance/page"),
      import("../compare/page"),
      import("../audit/page"),
      import("../reports/page"),
      import("../ai-lab/page"),
      import("../settings/page"),
      import("../broker/page"),
    ]);
    for (const mod of pages) {
      expect(typeof mod.default).toBe("function");
    }
  }, 90_000);

  it("wires terminal dashboard widgets and primary product nav", async () => {
    const workspace = await import("@/components/investment/InvestmentWorkspace");
    const terminal = await import("@/components/investment/InvestmentTerminalDashboard");
    const live = await import("@/components/investment/PortfolioMonitorLive");
    const widgets = await import("@/components/investment/investment-dashboard-widgets");
    const shell = await import("@/components/investment/InvestmentProductShell");
    const nav = await import("@/components/investment/InvestmentWorkspaceNav");
    expect(typeof workspace.InvestmentWorkspace).toBe("function");
    expect(typeof terminal.InvestmentTerminalDashboard).toBe("function");
    expect(typeof live.PortfolioMonitorLive).toBe("function");
    expect(typeof shell.InvestmentProductShell).toBe("function");
    expect(nav.INVESTMENT_NAV_LINKS).toHaveLength(12);
    expect(nav.INVESTMENT_NAV_LINKS.map((l) => l.label)).toEqual([
      "Dashboard",
      "Markets",
      "Opportunities",
      "Portfolio",
      "Orders",
      "Strategies",
      "Risk",
      "News",
      "Calendar",
      "AI Committee",
      "Reports",
      "Settings",
    ]);
    expect(nav.INVESTMENT_NAV_LINKS.some((l) => l.href === "/investment/strategies")).toBe(true);
    expect(nav.INVESTMENT_NAV_LINKS.some((l) => l.href === "/investment/ai-committee")).toBe(true);
    expect(nav.INVESTMENT_NAV_LINKS.some((l) => l.href === "/investment/orders")).toBe(true);
    const strategiesLab = await import("@/components/investment/StrategiesLaboratoryDashboard");
    expect(typeof strategiesLab.StrategiesLaboratoryDashboard).toBe("function");
    expect(typeof widgets.BrokerStatusWidget).toBe("function");
    expect(typeof widgets.AccountLiquidityWidget).toBe("function");
    expect(typeof widgets.ActiveOpportunitiesWidget).toBe("function");
    expect(typeof widgets.CommitteeSummaryWidget).toBe("function");
    expect(typeof widgets.RecentDecisionsWidget).toBe("function");
    const committeePanel = await import("@/components/investment/AiCommitteePanel");
    const committeeView = await import("@/components/investment/AiCommitteePageView");
    expect(typeof committeePanel.AiCommitteePanel).toBe("function");
    expect(typeof committeeView.AiCommitteePageView).toBe("function");
  });

  it("keeps legacy /investment/strategy redirect and Strategies Laboratory page", async () => {
    const legacy = await import("../strategy/page");
    const strategies = await import("../strategies/page");
    expect(typeof legacy.default).toBe("function");
    expect(typeof strategies.default).toBe("function");
  });

  it("keeps ANALYSIS_ONLY on dashboard / MI / strategies / portfolio APIs", async () => {
    const dash = await import("../../api/investment/dashboard/route");
    const mi = await import("../../api/investment/market-intelligence/route");
    const strat = await import("../../api/investment/strategies/route");
    const probe = await import("../../api/investment/probe-gather/route");
    const portfolio = await import("../../api/investment/portfolio/route");
    expect(typeof portfolio.GET).toBe("function");
    expect(typeof dash.GET).toBe("function");
    expect(typeof mi.GET).toBe("function");
    expect(typeof strat.GET).toBe("function");
    expect(typeof probe.GET).toBe("function");

    const miRes = await mi.GET();
    const miBody = await miRes.json();
    expect(miBody.mode).toBe("ANALYSIS_ONLY");
    expect(miBody.orderExecution).toBe("disabled");

    const stratRes = await strat.GET();
    const stratBody = await stratRes.json();
    expect(stratBody.mode).toBe("ANALYSIS_ONLY");
    expect(stratBody.orderExecution).toBe("disabled");
    expect(stratBody.strategyReadiness).toBe("NOT_READY");
    expect(stratBody.autonomousLive).toBe("LOCKED");

    const probeRes = await probe.GET(
      new Request("http://localhost/api/investment/probe-gather?symbols=AAPL"),
    );
    const probeBody = await probeRes.json();
    expect(probeBody.mode).toBe("ANALYSIS_ONLY");
    expect(probeBody.orderExecution).toBe("disabled");
    expect(probeBody.liveTradingEnabled).toBe(false);
    expect(probeBody.autonomousLive).toBe("LOCKED");
    expect(typeof probeBody.counts?.marketSnapshots).toBe("number");
  }, 30_000);

  it("registers ForgeOS Investment in primary sidebar with product IA children", async () => {
    const { SIDEBAR_ITEMS } = await import("@/lib/navigation/sidebar-items");
    const item = SIDEBAR_ITEMS.find((i) => i.id === "investment");
    expect(item?.href).toBe("/investment");
    expect(item?.label).toBe("ForgeOS Investment");
    expect(item?.section).toBe("primary");
    expect(item?.children?.length).toBe(12);
    expect(item?.children?.some((c) => c.href === "/investment/orders")).toBe(true);
    expect(item?.children?.some((c) => c.href === "/investment/strategies")).toBe(true);
    expect(item?.children?.some((c) => c.label === "AI Committee")).toBe(true);
    expect(item?.children?.some((c) => c.href === "/investment/reports")).toBe(true);
  });

  it("registers Investment on ForgeOS OS nav and desktop widget", async () => {
    const { OS_NAV_ITEMS } = await import("@/lib/os/navigation");
    const { DESKTOP_WIDGETS } = await import("@/lib/os/workspace-manager");
    const inv = OS_NAV_ITEMS.find((i) => i.id === "investment");
    expect(inv?.href).toBe("/investment");
    expect(inv?.label).toBe("ForgeOS Investment");
    expect(DESKTOP_WIDGETS.some((w) => w.type === "investment")).toBe(true);
  });
});
