import { OpportunityScannerDashboard } from "@/components/investment/opportunity-scanner-dashboard";
import styles from "@/styles/investment/workspace.module.css";

export const metadata = {
  title: "Opportunity Center",
  description: "Oportunidades de alta calidad A+/A detectadas automáticamente por ForgeOS.",
};

export default function InvestmentOpportunitiesPage() {
  return (
    <section className={styles.shellPage} aria-label="Opportunity Center">
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Opportunity Center</h1>
          <p className={styles.subtitle}>
            ForgeOS analiza los mercados continuamente y muestra solo oportunidades de alta calidad.
          </p>
        </div>
      </header>
      <OpportunityScannerDashboard />
    </section>
  );
}
