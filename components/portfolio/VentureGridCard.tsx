import Link from "next/link";
import type { PortfolioVentureCardModel } from "@/src/core/application/portfolio-command-center";

export function VentureGridCard({
  venture,
  portfolioId,
}: {
  venture: PortfolioVentureCardModel;
  portfolioId: string;
}) {
  return (
    <article className="mc-card pcc-venture-card">
      <h3 className="mc-card-title">{venture.name}</h3>
      <p className="mc-card-body">
        {venture.lifecycle} · {venture.priority} · {venture.valueStatus}
      </p>
      <p className="mc-card-body">Health: {venture.creationHealth}</p>
      <p className="mc-card-body">Executions: {venture.activeExecutions}</p>
      <p className="mc-card-body">Evidence: {venture.evidenceStatus}</p>
      <p className="mc-card-body">Latest release: {venture.latestRelease ?? "none"}</p>
      <p className="mc-card-body">Cost to next milestone: {venture.costToNextMilestone}</p>
      <p className="mc-card-body">Recommended: {venture.recommendedAction}</p>
      {venture.blockers.length > 0 ? <p className="mc-card-body">Blockers: {venture.blockers.join(", ")}</p> : null}
      <div className="ccc-actions">
        <Link href={`/company/${venture.ventureId}`} className="fhis-btn fhis-btn-primary">
          Open Company
        </Link>
        <Link href="/mission-control" className="fhis-btn">
          Open Mission
        </Link>
        <Link href={`/portfolio/${portfolioId}/value`} className="fhis-btn">
          Review Value
        </Link>
        {venture.latestPreview ? (
          <a href={venture.latestPreview} className="fhis-btn" target="_blank" rel="noreferrer">
            View Preview
          </a>
        ) : null}
      </div>
    </article>
  );
}
