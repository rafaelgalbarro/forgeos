import type { FounderPortfolioSection } from "@/lib/founder-dashboard/types";
import { PortfolioMetricsRow } from "@/components/dashboard/PortfolioMetricCard";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";

interface PortfolioPanelProps {
  portfolio: FounderPortfolioSection;
}

export function PortfolioPanel({ portfolio }: PortfolioPanelProps) {
  return (
    <section id="founder-portfolio">
      <SectionHeader title="Portfolio" subtitle={portfolio.summary} />
      <PortfolioMetricsRow metrics={portfolio.metrics} />
    </section>
  );
}
