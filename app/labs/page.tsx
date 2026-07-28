import Link from "next/link";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { Card } from "@/components/ui/fhis/Card";
import { LAB_LINKS } from "@/lib/navigation/labs-registry";

export const metadata = {
  title: "Labs — ForgeOS",
  description: "Índice central de laboratorios — Program 4100",
};

export default function LabsHubPage() {
  return (
    <OsModuleFrame
      title="Labs"
      description="Índice central de laboratorios — ingeniería y validación"
    >
      <p style={{ marginBottom: 16, color: "var(--fhis-color-text-muted)", fontSize: 14 }}>
        Todos los labs en un solo lugar. Acceso desde navegación secundaria — no en nav principal del fundador.
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
