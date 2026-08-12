import { InvestmentRouteShell } from "@/components/investment/InvestmentRouteShell";
import { getMarketIntelligenceStatus } from "@/lib/investment/market-intelligence-status";
import { gatherScreener } from "@/lib/investment/screener-gather";
import styles from "@/styles/investment/workspace.module.css";

export const metadata = {
  title: "Calendar",
  description: "ForgeOS Investment economic calendar — ANALYSIS_ONLY.",
};

export const dynamic = "force-dynamic";

export default async function InvestmentCalendarPage() {
  const status = getMarketIntelligenceStatus();
  const econ = status.economicProviders.map((p) => p.id);
  const gather = await gatherScreener();
  const indicators = gather.result?.economicIndicators ?? [];

  return (
    <>
      <InvestmentRouteShell
        title="Calendar"
        description="Economic calendar and macro events from Market Intelligence — no order path."
        moduleLabel="Market Intelligence"
        metrics={[
          { label: "Module", value: "Calendar" },
          { label: "Economic providers", value: String(econ.length) },
          { label: "Indicators", value: String(indicators.length) },
          { label: "LIVE_TRADING", value: "false" },
        ]}
        panels={[
          {
            title: "Economic calendar",
            state: econ.length || indicators.length ? "READY" : "NO_DATA",
            lines: econ.length
              ? econ
              : ["NO_DATA — configure FRED_API_KEY / ECB_ENABLED for economic events"],
          },
          {
            title: "Safety",
            state: "LOCKED",
            lines: ["ANALYSIS_ONLY", "Orders disabled", "Events are informational only"],
          },
        ]}
        links={[
          { href: "/investment/news", label: "News →" },
          { href: "/investment/markets", label: "Markets →" },
          { href: "/investment/risk", label: "Risk →" },
        ]}
      />

      <section className={styles.shellPage} aria-label="Macro indicators" style={{ marginTop: 12 }}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Macro indicators</h2>
            <span className={indicators.length ? styles.monitorOk : styles.monitorWarn}>
              {indicators.length ? "DATA" : "NO_DATA"}
            </span>
          </div>
          <ul className={styles.panelList}>
            {indicators.length === 0 ? (
              <li>NO_DATA — no economic indicators from configured providers</li>
            ) : (
              indicators.slice(0, 12).map((e) => (
                <li key={e.key}>
                  {e.label}: {e.value}
                  {e.unit ? ` ${e.unit}` : ""} · {e.period} · {e.providerId}
                </li>
              ))
            )}
          </ul>
        </article>
      </section>
    </>
  );
}
