import Link from "next/link";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { Card } from "@/components/ui/fhis/Card";
import { LAB_LINKS } from "@/lib/navigation/labs-registry";

export const metadata = { title: "Labs — ForgeOS OS" };

export default function OsLabsPage() {
  return (
    <OsModuleFrame
      title="Labs"
      description="Módulos de ingeniería — ver también /labs para índice founder-facing"
    >
      <p style={{ marginBottom: 16, fontSize: 14 }}>
        <Link href="/labs">→ Índice central /labs</Link>
      </p>
      <div className="fhis-os-build-grid">
        {LAB_LINKS.map((lab) => (
          <Card key={lab.href} className="fhis-os-build-card">
            <h3>{lab.label}</h3>
            <p>{lab.desc}</p>
            <Link href={lab.href}>Abrir →</Link>
          </Card>
        ))}
      </div>
    </OsModuleFrame>
  );
}
