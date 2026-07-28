import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCompanyDashboard } from "@/src/core/application/company-dashboard/company-dashboard-query";
import { CompanyCommandCenterView } from "@/components/experience/CompanyCommandCenterView";
import { LoadingState } from "@/components/ui/LoadingState";

interface Props {
  params: Promise<{ ventureId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { ventureId } = await params;
  return {
    title: `Company Command Center — ${ventureId}`,
    description: "PROGRAM 6090 — Company Creation Command Center",
  };
}

async function CompanyDashboardPanel({ ventureId }: { ventureId: string }) {
  const model = getCompanyDashboard(ventureId);
  if (!model) notFound();
  return <CompanyCommandCenterView model={model} />;
}

export default async function CompanyVenturePage({ params }: Props) {
  const { ventureId } = await params;
  return (
    <div style={{ padding: "clamp(12px, 3vw, 28px)" }}>
      <Suspense
        fallback={
          <LoadingState
            title="Cargando Company Command Center…"
            description="Agregando venture, mission, readiness y acciones."
          />
        }
      >
        <CompanyDashboardPanel ventureId={ventureId} />
      </Suspense>
    </div>
  );
}
