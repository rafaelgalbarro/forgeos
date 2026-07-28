import { notFound } from "next/navigation";
import { PortfolioCommandCenterView } from "@/components/portfolio/PortfolioCommandCenterView";
import { getPortfolioCommandCenter, type PortfolioViewTab } from "@/src/core/application/portfolio-command-center";

export async function PortfolioCommandCenterPage({
  portfolioId,
  activeTab,
  page,
}: {
  portfolioId: string;
  activeTab: PortfolioViewTab;
  page?: number;
}) {
  const model = getPortfolioCommandCenter({ portfolioId, page, pageSize: 20 });
  if (!model) notFound();
  return <PortfolioCommandCenterView model={model} activeTab={activeTab} />;
}
