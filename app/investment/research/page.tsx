import { InvestmentRouteShell } from "@/components/investment/InvestmentRouteShell";
import { ResearchEngineDashboard } from "@/components/investment/ResearchEngineDashboard";
import { runResearchOrchestrator } from "@/lib/investment/research/snapshot";

export const metadata = {
  title: "Research Engine",
  description:
    "Institutional AI Research Engine — news, macro, company, technical, quant, sentiment. ANALYSIS_ONLY.",
};

export const dynamic = "force-dynamic";

type Params = {
  symbol?: string;
  symbols?: string;
  persist?: string;
};

export default async function InvestmentResearchPage({
  searchParams,
}: {
  searchParams?: Promise<Params> | Params;
}) {
  const params = searchParams instanceof Promise ? await searchParams : searchParams;
  const symbols = params?.symbols
    ? params.symbols.split(",").map((s) => s.trim()).filter(Boolean)
    : params?.symbol
      ? [params.symbol]
      : undefined;

  const snapshot = await runResearchOrchestrator({
    symbols,
    persistMemory: params?.persist === "1",
  });

  const liveCount = snapshot.engines.filter((e) => e.wiring === "LIVE").length;
  const stubCount = snapshot.engines.filter((e) => e.wiring === "STUB").length;
  const configCount = snapshot.engines.filter((e) => e.wiring === "CONFIG_REQUIRED").length;

  return (
    <>
      <InvestmentRouteShell
        title="Research Engine"
        description="Institutional research system — modular engines over Market Intelligence. No fabricated Bloomberg/Reuters. ANALYSIS_ONLY · no orders."
        moduleLabel="Research Engine"
        metrics={[
          { label: "LIVE engines", value: String(liveCount) },
          { label: "CONFIG_REQUIRED", value: String(configCount) },
          { label: "STUB", value: String(stubCount) },
          { label: "Memory", value: String(snapshot.memoryCount) },
        ]}
        panels={[
          {
            title: "Safety",
            state: "LOCKED",
            lines: [
              "ANALYSIS_ONLY",
              "Orders disabled",
              "IBKR read-only among data sources",
              "Never invents headlines or ratios",
            ],
          },
          {
            title: "Honesty labels",
            state: "READY",
            lines: [
              "LIVE — configured provider data",
              "CONFIG_REQUIRED — missing API keys/flags",
              "NO_DATA — configured but empty gather",
              "STUB — Pattern Engine (future signal wiring)",
            ],
          },
        ]}
        links={[
          { href: "/investment/opportunities", label: "Opportunities →" },
          { href: "/investment/markets", label: "Markets →" },
          { href: "/investment/screener", label: "Screener →" },
          { href: "/investment/alpha", label: "Alpha →" },
          { href: "/api/investment/research?view=status", label: "API status →" },
        ]}
      />
      <ResearchEngineDashboard
        initial={snapshot}
        focusSymbol={params?.symbol}
      />
    </>
  );
}
