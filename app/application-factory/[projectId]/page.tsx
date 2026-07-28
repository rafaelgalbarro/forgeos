import { ApplicationFactoryDashboard } from "@/components/application-factory/ApplicationFactoryDashboard";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";

export const metadata = {
  title: "Application Factory — Proyecto — ForgeOS",
  description: "Program 4500 — Continuar proyecto de aplicación web",
};

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function ApplicationFactoryProjectPage({ params }: Props) {
  const { projectId } = await params;

  return (
    <OsModuleFrame
      title="Application Factory"
      description="Continuar proyecto — wizard guiado Next.js + Supabase"
    >
      <ApplicationFactoryDashboard initialProjectId={projectId} />
    </OsModuleFrame>
  );
}
