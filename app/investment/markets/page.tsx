import { Suspense } from "react";
import { MarketsPageTabs } from "@/components/investment/MarketsPageTabs";
import styles from "@/styles/investment/workspace.module.css";

export const metadata = {
  title: "Markets",
  description: "Mercados por región — cotizaciones IBKR, análisis simplificado.",
};

export const dynamic = "force-dynamic";

export default function InvestmentMarketsPage() {
  return (
    <section className={styles.shellPage} aria-label="Markets">
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Markets</h1>
          <p className={styles.subtitle}>
            Vista regional simplificada — USA, Europa, Asia y Crypto. Cotizaciones vía IBKR.
          </p>
        </div>
      </header>

      <Suspense fallback={<p className={styles.hubNote}>Cargando mercados…</p>}>
        <MarketsPageTabs />
      </Suspense>
    </section>
  );
}
