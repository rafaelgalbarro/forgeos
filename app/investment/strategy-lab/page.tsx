import { InvestmentRouteShell } from "@/components/investment/InvestmentRouteShell";
import { StrategyLabDashboard } from "@/components/investment/StrategyLabDashboard";
import { getStrategyLabSnapshot } from "@/lib/investment/strategy-lab-snapshot";

export const metadata = {
  title: "Strategy Lab",
  description:
    "Strategy Lab — quantitative research, validation, certification. ANALYSIS_ONLY. Live promotion blocked.",
};

export const dynamic = "force-dynamic";

type Params = { focus?: string; compare?: string; section?: string };

export default async function InvestmentStrategyLabPage({
  searchParams,
}: {
  searchParams?: Promise<Params> | Params;
}) {
  const params = searchParams instanceof Promise ? await searchParams : searchParams;
  const snapshot = await getStrategyLabSnapshot({
    focusStrategyId: params?.focus,
    compareWithStrategyId: params?.compare,
    persistMemory: true,
  });

  const certifiedBlocked = snapshot.certifications.filter((c) => c.verdict === "BLOCKED_LIVE").length;
  const section = params?.section?.trim();

  return (
    <>
      <InvestmentRouteShell
        title="Strategy Lab"
        description="Professional quantitative research lab — create, test, optimize, and certify strategies before production. Never auto-mutates live strategies."
        moduleLabel="Strategy Lab"
        metrics={[
          { label: "Strategies", value: String(snapshot.library.length) },
          { label: "Trade data", value: snapshot.tradeDataLabel },
          { label: "Sessions", value: String(snapshot.distinctSessions) },
          { label: "Live gate", value: snapshot.goLive },
        ]}
        panels={[
          {
            title: "Lab sections",
            state: "READY",
            lines: [
              snapshot.sections.join(" · "),
              `Top: ${snapshot.ranking[0]?.name ?? "NO_DATA"}`,
              `Cert BLOCKED_LIVE: ${certifiedBlocked}`,
              snapshot.note,
            ],
          },
          {
            title: "Safety",
            state: "LOCKED",
            lines: [
              "ANALYSIS_ONLY",
              "productionMutation=forbidden",
              "livePromotionAllowed=false",
              "AUTONOMOUS_LIVE LOCKED",
              "LIVE_TRADING_ENABLED false",
            ],
          },
        ]}
        links={[
          { href: "/investment/strategies", label: "Strategies Laboratory →" },
          { href: "/investment/backtesting", label: "Backtesting →" },
          { href: "/investment/paper", label: "Paper →" },
          { href: "/investment/shadow", label: "Shadow →" },
          { href: "/investment/ai-committee", label: "AI Committee →" },
          { href: "/investment/live", label: "Live (LOCKED) →" },
        ]}
      />
      <StrategyLabDashboard
        initial={snapshot}
        initialSection={
          section === "backtesting" ||
          section === "walk-forward" ||
          section === "optimizer" ||
          section === "monte-carlo" ||
          section === "library"
            ? section
            : "library"
        }
      />
    </>
  );
}
