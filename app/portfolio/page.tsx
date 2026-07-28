import Link from "next/link";
import { getCompositionRoot } from "@/src/core/composition";

export const metadata = {
  title: "Portfolio — ForgeOS",
  description: "PROGRAM 6130 — Portfolio list",
};

export default function PortfolioListPage() {
  const root = getCompositionRoot();
  const cert = (root.store.meta as Record<string, unknown>).portfolio6150 as
    | { portfolioId?: string; readModel?: { name?: string; summary?: { totalVentures?: number } } }
    | undefined;

  const items = cert?.portfolioId
    ? [
        {
          id: cert.portfolioId,
          name: cert.readModel?.name ?? cert.portfolioId,
          ventures: cert.readModel?.summary?.totalVentures ?? 0,
        },
      ]
    : [];

  return (
    <div style={{ padding: "clamp(12px, 3vw, 28px)", maxWidth: 960 }}>
      <h1>Portfolio</h1>
      {items.length === 0 ? <p>No certified portfolio read model found.</p> : null}
      <div className="ccc-grid">
        {items.map((portfolio) => (
          <article key={portfolio.id} className="mc-card">
            <h2 className="mc-card-title">{portfolio.name}</h2>
            <p className="mc-card-body">Ventures: {portfolio.ventures}</p>
            <div className="ccc-actions">
              <Link href={`/portfolio/${portfolio.id}`} className="fhis-btn fhis-btn-primary">
                Open Command Center
              </Link>
              <Link href={`/portfolio/${portfolio.id}/ventures`} className="fhis-btn">
                Ventures
              </Link>
              <Link href={`/portfolio/${portfolio.id}/value`} className="fhis-btn">
                Value
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
