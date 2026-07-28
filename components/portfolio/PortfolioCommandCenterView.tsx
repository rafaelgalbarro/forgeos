import { PortfolioAlerts } from "./PortfolioAlerts";
import { PortfolioQuickView } from "./PortfolioQuickView";
import { PortfolioViewTabs } from "./PortfolioViewTabs";
import Link from "next/link";
import { VentureGridCard } from "./VentureGridCard";
import { ExecutionBoard } from "./ExecutionBoard";
import { ValueBoard } from "./ValueBoard";
import { ResourceBoard } from "./ResourceBoard";
import { MultiCreateFlow } from "./MultiCreateFlow";
import type {
  PortfolioCommandCenterReadModel,
  PortfolioViewTab,
} from "@/src/core/application/portfolio-command-center";

export function PortfolioCommandCenterView({
  model,
  activeTab,
}: {
  model: PortfolioCommandCenterReadModel;
  activeTab: PortfolioViewTab;
}) {
  return (
    <div className="ccc-root" data-testid="portfolio-command-center">
      <PortfolioQuickView model={model.quickView} />
      <PortfolioViewTabs portfolioId={model.portfolioId} tabs={model.tabs} activeTab={activeTab} />
      <PortfolioAlerts alerts={model.alerts} />

      {(activeTab === "OVERVIEW" || activeTab === "VENTURES") && (
        <>
          <section className="ccc-grid" aria-label="Venture grid">
            {model.ventures.map((venture) => (
              <VentureGridCard key={venture.ventureId} venture={venture} portfolioId={model.portfolioId} />
            ))}
          </section>
          <div className="pcc-wizard-actions">
            <span className="mc-card-body">
              Page {model.pagination.page} / {model.pagination.totalPages} · {model.pagination.total} ventures
            </span>
            {model.pagination.page > 1 ? (
              <Link
                href={`/portfolio/${model.portfolioId}?page=${model.pagination.page - 1}`}
                className="fhis-btn"
              >
                Previous page
              </Link>
            ) : null}
            {model.pagination.page < model.pagination.totalPages ? (
              <Link
                href={`/portfolio/${model.portfolioId}?page=${model.pagination.page + 1}`}
                className="fhis-btn"
              >
                Next page
              </Link>
            ) : null}
          </div>
        </>
      )}

      {(activeTab === "OVERVIEW" || activeTab === "EXECUTIONS") && <ExecutionBoard rows={model.executions} />}
      {(activeTab === "OVERVIEW" || activeTab === "VALUE") && <ValueBoard rows={model.value} />}
      {(activeTab === "OVERVIEW" || activeTab === "RESOURCES") && <ResourceBoard rows={model.resources} />}

      {activeTab === "OVERVIEW" && (
        <MultiCreateFlow portfolioId={model.portfolioId} workspaceId={model.workspaceId} />
      )}
    </div>
  );
}

