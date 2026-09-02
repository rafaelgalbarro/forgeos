import type { PortfolioViewTab } from "@/src/core/application/portfolio-command-center";

const TAB_TO_SEGMENT: Record<PortfolioViewTab, string> = {
  OVERVIEW: "",
  VENTURES: "ventures",
  VALUE: "value",
  ANALYTICS: "analytics",
  EXECUTIONS: "executions",
  RESOURCES: "resources",
  RISKS: "",
  APPROVALS: "",
  SHARED_ASSETS: "",
  ACTIVITY: "",
};

export function getPortfolioTabHref(portfolioId: string, tab: PortfolioViewTab): string {
  const segment = TAB_TO_SEGMENT[tab];
  return segment ? `/portfolio/${portfolioId}/${segment}` : `/portfolio/${portfolioId}`;
}
