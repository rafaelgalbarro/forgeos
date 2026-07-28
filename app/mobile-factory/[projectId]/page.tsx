import { MobileFactoryDashboard } from "@/components/mobile-factory/MobileFactoryDashboard";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";

export const metadata = {
  title: "Mobile Factory — Proyecto — ForgeOS",
  description: "Program 4600 — Continuar proyecto móvil",
};

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function MobileFactoryProjectPage({ params }: Props) {
  const { projectId } = await params;

  return (
    <OsModuleFrame
      title="Mobile Factory"
      description="Continuar proyecto móvil — wizard guiado Expo/React Native"
    >
      <MobileFactoryDashboard initialProjectId={projectId} />
    </OsModuleFrame>
  );
}
