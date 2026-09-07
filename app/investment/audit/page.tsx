import { Suspense } from "react";
import { InvestmentRouteShell } from "@/components/investment/InvestmentRouteShell";
import { AuditFilterBar } from "@/components/investment/AuditFilterBar";
import { getAuditTimeline } from "@/lib/investment/audit-timeline";
import styles from "@/styles/investment/workspace.module.css";

export const metadata = {
  title: "Audit",
  description: "Investment audit trail — ANALYSIS_ONLY.",
};

export const dynamic = "force-dynamic";

type Params = { kind?: string; symbol?: string; q?: string; analytics?: string };

export default async function InvestmentAuditPage({
  searchParams,
}: {
  searchParams?: Promise<Params> | Params;
}) {
  const params = searchParams instanceof Promise ? await searchParams : searchParams;
  const timeline = await getAuditTimeline({
    kind: params?.kind,
    symbol: params?.symbol,
    q: params?.q,
    analytics: params?.analytics,
    limit: 100,
  });

  return (
    <>
      <InvestmentRouteShell
        title="Audit"
        description="Read-only Investment Memory decision history. Filter by kind / symbol."
        moduleLabel="Investment Audit / Memory"
        metrics={[
          { label: "Shown", value: String(timeline.count) },
          { label: "Total", value: String(timeline.totalUnfiltered) },
          { label: "Mode", value: timeline.mode },
          { label: "Orders", value: "disabled" },
        ]}
        panels={[
          {
            title: "Timeline",
            state: timeline.count ? "READY" : "NO_DATA",
            lines: [timeline.note],
          },
          {
            title: "Safety",
            state: "LOCKED",
            lines: ["Read-only", "ANALYSIS_ONLY", "Zero order path"],
          },
        ]}
        links={[
          { href: "/investment/ai-committee", label: "AI Committee →" },
          { href: "/investment/live", label: "Live Trading →" },
          { href: "/investment/shadow", label: "Shadow Trading →" },
        ]}
      />

      <Suspense fallback={<p className={styles.hubNote}>Loading filters…</p>}>
        <AuditFilterBar symbols={timeline.availableSymbols} />
      </Suspense>

      <section className={styles.shellPage} aria-label="Audit timeline">
        <div className={styles.grid}>
          {timeline.items.length === 0 ? (
            <article className={styles.panel}>
              <ul className={styles.panelList}>
                <li>NO_DATA</li>
              </ul>
            </article>
          ) : (
            timeline.items.slice(0, 40).map((item) => (
              <article key={item.id} className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>{item.kind}</h2>
                  <span className={styles.monitorMetaText}>
                    {new Date(item.occurredAt).toLocaleString()}
                  </span>
                </div>
                <ul className={styles.panelList}>
                  <li>Symbol: {item.symbol}</li>
                  <li>{item.summary}</li>
                  <li>Provenance: {item.provenance}</li>
                </ul>
              </article>
            ))
          )}
        </div>
      </section>
    </>
  );
}
