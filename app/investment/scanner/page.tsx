import { InvestmentRouteShell } from "@/components/investment/InvestmentRouteShell";
import { MarketScannerDashboard } from "@/components/investment/MarketScannerDashboard";
import { getMarketScannerSnapshot } from "@/lib/investment/market-scanner";

export const metadata = {
  title: "Market Scanner",
  description:
    "Continuous market scanner — agents → committee → opportunities. ANALYSIS_ONLY, live locked.",
};

export const dynamic = "force-dynamic";

export default async function InvestmentMarketScannerPage() {
  const snapshot = await getMarketScannerSnapshot({ ensureCycle: true });

  return (
    <>
      <InvestmentRouteShell
        title="Market Scanner"
        description="Real-time-ish continuous analysis: accepted/discarded opportunities with committee consensus."
        moduleLabel="Continuous Analysis"
        metrics={[
          { label: "Accepted", value: String(snapshot.accepted.length) },
          { label: "Discarded", value: String(snapshot.discarded.length) },
          { label: "Agents", value: String(snapshot.agentsRegistered) },
          { label: "MI", value: snapshot.miDataQuality },
        ]}
        panels={[
          {
            title: "Continuous loop",
            state: snapshot.runtime.status === "running" ? "READY" : "IDLE",
            lines: [
              snapshot.note,
              `Cycles: ${snapshot.runtime.cyclesCompleted}`,
              `Last: ${snapshot.runtime.lastCycleAt ?? "NO_DATA"}`,
              `MI providers: ${snapshot.miProvidersUsed.length ? snapshot.miProvidersUsed.join(", ") : "none (stub signals)"}`,
            ],
          },
          {
            title: "Safety",
            state: "LOCKED",
            lines: [
              "ANALYSIS_ONLY",
              "IBKR_READ_ONLY true",
              "AUTONOMOUS_LIVE LOCKED",
              "GO_LIVE NOT_READY_FOR_LIVE",
              "Zero real orders",
            ],
          },
        ]}
        links={[
          { href: "/investment/strategies", label: "Strategies →" },
          { href: "/investment/opportunities", label: "Opportunities →" },
          { href: "/investment/ai-committee", label: "AI Committee →" },
          { href: "/investment/screener", label: "Screener →" },
        ]}
      />
      <MarketScannerDashboard />
    </>
  );
}
