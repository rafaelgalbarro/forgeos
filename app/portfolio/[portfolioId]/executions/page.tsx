import { PortfolioCommandCenterPage } from "../_view";

interface Props {
  params: Promise<{ portfolioId: string }>;
}

export default async function PortfolioExecutionsRoute({ params }: Props) {
  const { portfolioId } = await params;
  return (
    <div style={{ padding: "clamp(12px, 3vw, 28px)" }}>
      <PortfolioCommandCenterPage portfolioId={portfolioId} activeTab="EXECUTIONS" />
    </div>
  );
}
