import { buildControlPanelSnapshot } from "@/lib/ai-control/control-panel";
import { AiControlCenter } from "@/components/ai-control/AiControlCenter";

export const metadata = {
  title: "Centro de Control IA — ForgeOS",
  description: "Program 3000 Sprint 4 — Activación IA real, proveedores y telemetría",
};

export default async function AiControlPage() {
  const snapshot = await buildControlPanelSnapshot();
  return <AiControlCenter snapshot={snapshot} />;
}
