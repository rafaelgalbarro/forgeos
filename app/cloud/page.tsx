import { CloudDashboard } from "@/components/cloud-foundation/CloudDashboard";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";

export const metadata = {
  title: "Cloud Foundation — ForgeOS",
  description: "Program 4300 — Fundación cloud: GitHub, Vercel, Cloudflare, Supabase (preparación)",
};

export default function CloudPage() {
  return (
    <OsModuleFrame
      title="Cloud Foundation"
      description="Estrategia cloud, entornos y despliegues — solo preparación, sin producción"
    >
      <CloudDashboard showLabLink />
    </OsModuleFrame>
  );
}
