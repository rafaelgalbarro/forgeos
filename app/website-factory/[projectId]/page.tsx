import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { WebsiteFactoryDashboard } from "@/components/website-factory/WebsiteFactoryDashboard";

export const metadata = {
  title: "Website Factory — Proyecto — ForgeOS",
  description: "Program 4400 — Continúa el wizard de tu sitio web",
};

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function WebsiteFactoryProjectPage({ params }: Props) {
  const { projectId } = await params;

  return (
    <OsModuleFrame
      title="Website Factory"
      description={`Proyecto: ${projectId}`}
    >
      <WebsiteFactoryDashboard projectId={projectId} />
    </OsModuleFrame>
  );
}
