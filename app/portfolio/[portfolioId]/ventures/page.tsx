import { PortfolioCommandCenterPage } from "../_view";

interface Props {
  params: Promise<{ portfolioId: string }>;
  searchParams?: Promise<{ page?: string }>;
}

export default async function PortfolioVenturesRoute({ params, searchParams }: Props) {
  const { portfolioId } = await params;
  const search = searchParams ? await searchParams : undefined;
  const page = search?.page ? Number(search.page) : 1;
  return (
    <div style={{ padding: "clamp(12px, 3vw, 28px)" }}>
      <PortfolioCommandCenterPage portfolioId={portfolioId} activeTab="VENTURES" page={page} />
    </div>
  );
}
