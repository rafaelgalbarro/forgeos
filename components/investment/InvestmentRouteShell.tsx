import styles from "@/styles/investment/workspace.module.css";
import Link from "next/link";

export type ShellMetric = {
  readonly label: string;
  readonly value: string;
};

export type ShellPanel = {
  readonly title: string;
  readonly state?: string;
  readonly lines: readonly string[];
};

export type ShellLink = {
  readonly href: string;
  readonly label: string;
};

/**
 * Professional shell for investment module surfaces.
 * Never invents market data — clearly NO_DATA / ANALYSIS_ONLY.
 */
export function InvestmentRouteShell({
  title,
  description,
  moduleLabel,
  metrics,
  panels,
  links,
}: {
  title: string;
  description: string;
  moduleLabel: string;
  metrics?: readonly ShellMetric[];
  panels?: readonly ShellPanel[];
  links?: readonly ShellLink[];
}) {
  const defaultMetrics: ShellMetric[] = [
    { label: "Module", value: moduleLabel },
    { label: "Orders", value: "disabled" },
    { label: "LIVE_TRADING", value: "false" },
    { label: "IBKR_READ_ONLY", value: "true" },
  ];
  const shownMetrics = metrics?.length ? metrics : defaultMetrics;
  const shownPanels =
    panels?.length
      ? panels
      : ([
          {
            title: "Status",
            state: "READY",
            lines: [
              "Surface online",
              "Data: NO_DATA until module binds existing APIs",
              "Mode: ANALYSIS_ONLY",
            ],
          },
          {
            title: "Safety",
            state: "LOCKED",
            lines: [
              "Order execution: disabled",
              "Auto-activate orders: off",
              "IBKR connection: unchanged by this page",
            ],
          },
        ] as const);

  return (
    <section className={styles.shellPage} aria-label={title}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{description}</p>
        </div>
        <span className={styles.readOnlyTag}>ANALYSIS_ONLY</span>
      </header>
      <article className={styles.hub}>
        <div className={styles.hubGrid}>
          {shownMetrics.map((m) => (
            <div key={m.label} className={styles.hubItem}>
              <span className={styles.hubLabel}>{m.label}</span>
              <strong className={styles.hubValue}>{m.value}</strong>
            </div>
          ))}
        </div>
        <p className={styles.hubNote}>
          Professional module surface — reuses ForgeOS Investment services. No synthetic market data
          as live. No order path.
        </p>
        {links && links.length > 0 ? (
          <p className={styles.hubList} style={{ listStyle: "none", paddingLeft: 0, display: "flex", flexWrap: "wrap", gap: 10 }}>
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={styles.forgeosLink}>
                {l.label}
              </Link>
            ))}
          </p>
        ) : null}
      </article>
      <div className={styles.grid}>
        {shownPanels.map((panel) => (
          <article key={panel.title} className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>{panel.title}</h2>
              {panel.state ? (
                <span
                  className={
                    panel.state === "LOCKED" || panel.state === "READY" || panel.state === "CONNECTED"
                      ? styles.monitorOk
                      : styles.monitorWarn
                  }
                >
                  {panel.state}
                </span>
              ) : null}
            </div>
            <ul className={styles.panelList}>
              {panel.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
