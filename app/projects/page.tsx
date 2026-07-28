import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProjectsList } from "@/components/projects/ProjectsList";

export default function ProjectsPage() {
  return (
    <section>
      <PageHeader
        badge="Portfolio"
        title="Tus startups"
        description="Empresas digitales en ForgeOS. Cada venture incluye el paquete completo de validación y lanzamiento."
      />
      <Suspense fallback={<p className="muted">Cargando portfolio…</p>}>
        <ProjectsList />
      </Suspense>
    </section>
  );
}
