import { InvestmentRouteShell } from "@/components/investment/InvestmentRouteShell";
import { getMarketIntelligenceStatus } from "@/lib/investment/market-intelligence-status";
import { gatherScreener } from "@/lib/investment/screener-gather";
import styles from "@/styles/investment/workspace.module.css";

export const metadata = {
  title: "News",
  description: "ForgeOS Investment news — Market Intelligence providers. ANALYSIS_ONLY.",
};

export const dynamic = "force-dynamic";

export default async function InvestmentNewsPage() {
  const status = getMarketIntelligenceStatus();
  const newsProviders = status.newsProviders.map((p) => p.id);
  const sentiment = status.sentimentProviders.map((p) => p.id);
  const gather = await gatherScreener();
  const headlines = gather.result?.news ?? [];

  return (
    <>
      <InvestmentRouteShell
        title="News"
        description="Market news and sentiment via Market Intelligence — advisory only, no order path."
        moduleLabel="Market Intelligence"
        metrics={[
          { label: "Module", value: "News" },
          { label: "News providers", value: String(newsProviders.length) },
          { label: "Headlines", value: String(headlines.length) },
          { label: "Orders", value: "disabled" },
        ]}
        panels={[
          {
            title: "News providers",
            state: newsProviders.length ? "READY" : "NO_DATA",
            lines: newsProviders.length
              ? newsProviders
              : ["NO_DATA — configure NEWSAPI_KEY / RSS_FEED_URLS"],
          },
          {
            title: "Sentiment",
            state: sentiment.length ? "READY" : "NO_DATA",
            lines: sentiment.length ? sentiment : ["NO_DATA — no sentiment providers configured"],
          },
          {
            title: "Safety",
            state: "LOCKED",
            lines: ["ANALYSIS_ONLY", "Orders disabled", "No fabricated headlines"],
          },
        ]}
        links={[
          { href: "/investment/calendar", label: "Calendar →" },
          { href: "/investment/markets", label: "Markets →" },
          { href: "/investment/research", label: "Full research →" },
        ]}
      />

      <section className={styles.shellPage} aria-label="Headlines" style={{ marginTop: 12 }}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Latest headlines</h2>
            <span className={headlines.length ? styles.monitorOk : styles.monitorWarn}>
              {headlines.length ? "DATA" : "NO_DATA"}
            </span>
          </div>
          <ul className={styles.panelList}>
            {headlines.length === 0 ? (
              <li>NO_DATA — no headlines from configured providers</li>
            ) : (
              headlines.slice(0, 12).map((n) => (
                <li key={n.id}>
                  {n.title} · {n.source} ·{" "}
                  {n.publishedAt ? new Date(n.publishedAt).toLocaleString() : "NO_DATA"}
                </li>
              ))
            )}
          </ul>
        </article>
      </section>
    </>
  );
}
