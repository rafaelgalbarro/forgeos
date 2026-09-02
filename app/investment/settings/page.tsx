import { InvestmentRouteShell } from "@/components/investment/InvestmentRouteShell";
import { SettingsProbeGather } from "@/components/investment/SettingsProbeGather";
import { getInvestmentSettingsSnapshot } from "@/lib/investment/settings-snapshot";
import styles from "@/styles/investment/workspace.module.css";

export const metadata = {
  title: "Settings",
  description: "Investment OS settings — safety flags remain locked.",
};

export const dynamic = "force-dynamic";

export default function InvestmentSettingsPage() {
  const snap = getInvestmentSettingsSnapshot();

  return (
    <>
      <InvestmentRouteShell
        title="Settings"
        description="Operating mode, MI provider health, and key presence. Secret values never shown."
        moduleLabel="Investment Settings"
        metrics={[
          { label: "Mode", value: snap.mode },
          { label: "LIVE", value: "false" },
          { label: "IBKR RO", value: "true" },
          { label: "MI providers", value: String(snap.mi.totalConfigured) },
        ]}
        panels={[
          {
            title: "Safety (locked)",
            state: "LOCKED",
            lines: [
              `TRADING_MODE=${snap.tradingMode}`,
              "LIVE_TRADING_ENABLED=false",
              "IBKR_READ_ONLY=true",
              "AUTONOMOUS_LIVE=LOCKED",
              "orderExecution=disabled",
            ],
          },
          {
            title: "IBKR market data",
            state: snap.ibkrMarketData.status === "READ_ONLY_ROUTE" ? "READY" : "NO_DATA",
            lines: [
              snap.ibkrMarketData.note,
              `Status: ${snap.ibkrMarketData.status}`,
              `Available: ${snap.ibkrMarketData.availableReadPaths.join(", ")}`,
              `Missing: ${snap.ibkrMarketData.missingPaths.join(", ")}`,
            ],
          },
        ]}
        links={[
          { href: "/investment/markets", label: "Markets →" },
          { href: "/investment/research", label: "Research →" },
          { href: "/investment/audit", label: "Audit →" },
        ]}
      />

      <div className={styles.grid} style={{ marginTop: 12 }}>
        <SettingsProbeGather />

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Env key presence</h2>
            <span className={styles.monitorWarn}>NO SECRETS</span>
          </div>
          <ul className={styles.panelList}>
            {snap.keyPresence.map((row) => (
              <li key={row.envName}>
                {row.envName}: {row.present ? "present" : "absent"} ({row.kind})
              </li>
            ))}
          </ul>
          <p className={styles.hubNote}>{snap.note}</p>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Market Intelligence provider catalog</h2>
            <span className={snap.mi.totalConfigured ? styles.monitorOk : styles.monitorWarn}>
              {snap.mi.totalConfigured}/{snap.mi.totalKnown} CONFIGURED
            </span>
          </div>
          <ul className={styles.panelList}>
            {snap.mi.providers.map((provider) => (
              <li key={provider.id}>
                <strong>{provider.provider}</strong> · Status: {provider.status} · Last Success:{" "}
                {provider.lastSuccess ?? "NO_DATA"} · Latency:{" "}
                {provider.latencyMs === null ? "NO_DATA" : `${provider.latencyMs}ms`} · Data Types:{" "}
                {provider.dataTypes.join(", ")} · Errors:{" "}
                {provider.errors.length ? provider.errors.join("; ") : "none"}
              </li>
            ))}
          </ul>
          <p className={styles.hubNote}>{snap.mi.note}</p>
        </article>
      </div>
    </>
  );
}
