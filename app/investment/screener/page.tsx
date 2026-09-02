import { Suspense } from "react";
import { InvestmentRouteShell } from "@/components/investment/InvestmentRouteShell";
import { ScreenerFilterBar } from "@/components/investment/ScreenerFilterBar";
import {
  inspectScreenerFieldAvailability,
  snapshotAssetClass,
  snapshotLastVolume,
} from "@/lib/investment/screener-field-availability";
import { gatherScreener } from "@/lib/investment/screener-gather";
import styles from "@/styles/investment/workspace.module.css";

export const metadata = {
  title: "Screener",
  description: "Market screener — ANALYSIS_ONLY, Market Intelligence backed.",
};

export const dynamic = "force-dynamic";

type Params = {
  symbols?: string;
  provider?: string;
  priced?: string;
  assetClass?: string;
  liquidity?: string;
  q?: string;
};

export default async function InvestmentScreenerPage({
  searchParams,
}: {
  searchParams?: Promise<Params> | Params;
}) {
  const params = searchParams instanceof Promise ? await searchParams : searchParams;
  const symbols = params?.symbols
    ? params.symbols.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;
  const gather = await gatherScreener(symbols);
  const allSnapshots = gather.result?.marketSnapshots ?? [];
  const allNews = gather.result?.news ?? [];
  const errors = gather.result?.errors ?? [];
  const fields = inspectScreenerFieldAvailability(allSnapshots);

  const providerFilter = params?.provider?.trim() || "ALL";
  const pricedFilter = params?.priced?.trim() || "ALL";
  const assetClassFilter =
    fields.assetClassExposed ? params?.assetClass?.trim() || "ALL" : "ALL";
  const liquidityFilter =
    fields.liquidityExposed ? params?.liquidity?.trim() || "ALL" : "ALL";
  const q = (params?.q ?? "").trim().toLowerCase();

  const snapshots = allSnapshots.filter((s) => {
    if (providerFilter !== "ALL" && s.providerId !== providerFilter) return false;
    const hasPrice = typeof s.quote?.price === "number";
    if (pricedFilter === "HAS_PRICE" && !hasPrice) return false;
    if (pricedFilter === "NO_PRICE" && hasPrice) return false;
    if (assetClassFilter !== "ALL") {
      const ac = snapshotAssetClass(s);
      if (ac !== assetClassFilter) return false;
    }
    if (liquidityFilter === "HAS_VOLUME" && snapshotLastVolume(s) == null) return false;
    if (liquidityFilter === "NO_VOLUME" && snapshotLastVolume(s) != null) return false;
    if (q) {
      const hay = `${s.symbol} ${s.providerId} ${snapshotAssetClass(s) ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const news = allNews.filter((n) => {
    if (providerFilter !== "ALL" && n.providerId !== providerFilter) return false;
    if (q) {
      const hay = `${n.title} ${n.providerId} ${n.source}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const providers = Array.from(
    new Set([
      ...allSnapshots.map((s) => s.providerId),
      ...allNews.map((n) => n.providerId),
    ]),
  ).sort();

  return (
    <>
      <InvestmentRouteShell
        title="Screener"
        description="Gather via configured Market Intelligence providers only. Filters apply to gather results."
        moduleLabel="Market Intelligence / Screener"
        metrics={[
          { label: "Providers", value: String(gather.providersConfigured) },
          { label: "Symbols", value: gather.symbols.join(", ") || "NO_DATA" },
          { label: "Shown", value: `${snapshots.length}/${allSnapshots.length}` },
          { label: "Orders", value: "disabled" },
        ]}
        panels={[
          {
            title: "Gather status",
            state: gather.empty ? "NO_DATA" : "READY",
            lines: [gather.note, gather.tradeGate, `Mode: ${gather.mode}`],
          },
          {
            title: "Optional MI fields",
            state: fields.assetClassExposed || fields.liquidityExposed ? "PARTIAL" : "NO_DATA",
            lines: [
              fields.note,
              `assetClass: ${fields.assetClassExposed ? fields.assetClasses.join(", ") : "NO_DATA"}`,
              `liquidity (volume): ${fields.liquidityExposed ? "exposed" : "NO_DATA"}`,
            ],
          },
          {
            title: "Safety",
            state: "LOCKED",
            lines: [
              "ANALYSIS_ONLY",
              "No auto-orders from screener hits",
              "NO_TRADE when DELAYED/STALE",
            ],
          },
        ]}
        links={[
          { href: "/investment/markets", label: "Markets →" },
          { href: "/investment/opportunities", label: "Opportunities →" },
          { href: "/investment/research", label: "Research →" },
        ]}
      />

      <Suspense fallback={<p className={styles.hubNote}>Loading filters…</p>}>
        <ScreenerFilterBar
          providers={providers}
          symbols={gather.symbols}
          assetClassExposed={fields.assetClassExposed}
          assetClasses={fields.assetClasses}
          liquidityExposed={fields.liquidityExposed}
        />
      </Suspense>

      <div className={styles.grid} style={{ marginTop: 4 }}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Market snapshots</h2>
            <span className={snapshots.length ? styles.monitorOk : styles.monitorWarn}>
              {snapshots.length ? "DATA" : "NO_DATA"}
            </span>
          </div>
          <ul className={styles.panelList}>
            {snapshots.length === 0 ? (
              <li>NO_DATA — no rows match filters / providers</li>
            ) : (
              snapshots.slice(0, 40).map((s) => {
                const ac = snapshotAssetClass(s);
                const vol = snapshotLastVolume(s);
                return (
                  <li key={`${s.providerId}-${s.symbol}-${s.capturedAt}`}>
                    {s.symbol} · {s.providerId} · last=
                    {typeof s.quote?.price === "number" ? s.quote.price.toFixed(2) : "NO_DATA"}
                    {" · "}class={ac ?? "NO_DATA"}
                    {" · "}vol={vol == null ? "NO_DATA" : vol.toLocaleString()}
                  </li>
                );
              })
            )}
          </ul>
        </article>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>News</h2>
            <span className={news.length ? styles.monitorOk : styles.monitorWarn}>
              {news.length ? "DATA" : "NO_DATA"}
            </span>
          </div>
          <ul className={styles.panelList}>
            {news.length === 0 ? (
              <li>NO_DATA</li>
            ) : (
              news.slice(0, 20).map((n) => (
                <li key={`${n.providerId}-${n.id}`}>
                  [{n.providerId}] {n.title}
                </li>
              ))
            )}
          </ul>
        </article>
      </div>
    </>
  );
}
