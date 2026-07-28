import { BuildPipelineDashboard } from "@/components/build-pipeline/BuildPipelineDashboard";
import { PreviewDeploymentHistorySection } from "@/components/preview-deployment/PreviewDeploymentHistorySection";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = {
  title: "Despliegues — ForgeOS Build Pipeline",
  description: "Program 3000 Sprint 5 + PROGRAM 5380 — Dashboard unificado de pipeline y preview deployment",
};

export default function DeploymentsPage() {
  return (
    <>
      <PageHeader
        badge="5380"
        title="Despliegues"
        description="Pipeline de build unificado — GitHub, Supabase, Vercel, Preview Deployment"
      />
      <PreviewDeploymentHistorySection />
      <BuildPipelineDashboard />
    </>
  );
}
