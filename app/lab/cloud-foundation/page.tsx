import Link from "next/link";
import { CloudDashboard } from "@/components/cloud-foundation/CloudDashboard";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { Panel, SectionHeader } from "@/components/ui/fhis";
import { CLOUD_FOUNDATION_VERSION } from "@/lib/cloud-foundation";

export const metadata = {
  title: "Cloud Foundation Lab — ForgeOS",
  description: "Program 4300 — Harness de ingeniería cloud",
};

export default function CloudFoundationLabPage() {
  return (
    <OsModuleFrame
      title="Cloud Foundation Lab"
      description={`${CLOUD_FOUNDATION_VERSION} — harness de validación`}
    >
      <Panel className="fhis-cloud-lab-intro">
        <SectionHeader title="Lab harness" subtitle="Mismos motores que /cloud" />
        <p className="fhis-cloud-text">
          Preparación cloud sin modificar Runtime, Executive Mesh, AI Runtime ni Skills.
        </p>
        <Link href="/cloud" className="fhis-cloud-link">
          Abrir dashboard principal →
        </Link>
      </Panel>
      <CloudDashboard />
    </OsModuleFrame>
  );
}
