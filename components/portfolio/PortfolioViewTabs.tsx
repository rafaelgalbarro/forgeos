"use client";

import Link from "next/link";
import type { PortfolioViewTab } from "@/src/core/application/portfolio-command-center";
import { getPortfolioTabHref } from "./tab-routes";

export function PortfolioViewTabs({
  portfolioId,
  tabs,
  activeTab,
}: {
  portfolioId: string;
  tabs: PortfolioViewTab[];
  activeTab: PortfolioViewTab;
}) {
  return (
    <nav className="pcc-tabs" aria-label="Portfolio views">
      {tabs.map((tab) => {
        const href = getPortfolioTabHref(portfolioId, tab);
        return (
          <Link
            key={tab}
            href={href}
            className={`fhis-btn ${activeTab === tab ? "fhis-btn-primary" : ""}`}
            aria-current={activeTab === tab ? "page" : undefined}
          >
            {tab.replace("_", " ")}
          </Link>
        );
      })}
    </nav>
  );
}
