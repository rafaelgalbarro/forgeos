import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCompositionRoot } from "@/src/core/composition";

export const metadata = {
  title: "Company OS — ForgeOS",
  description: "PROGRAM 6060 — Company OS hub",
};

export default function CompanyIndexPage() {
  const ventures = [...getCompositionRoot().store.ventures.values()];
  return (
    <div style={{ padding: "clamp(12px, 3vw, 28px)", maxWidth: 720 }}>
      <EmptyState
        title="Company OS"
        description="Selecciona un venture para abrir /company/[ventureId] con estado consolidado de creación."
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14, justifyContent: "center" }}>
          {ventures.length === 0 ? <span style={{ opacity: 0.8 }}>No ventures found yet.</span> : null}
          {ventures.map((venture) => (
            <Link key={venture.id} href={`/company/${venture.id}`} className="fhis-btn fhis-btn-primary">
              {venture.name}
            </Link>
          ))}
          <Link href="/ventures" className="fhis-btn">
            Ventures
          </Link>
        </div>
      </EmptyState>
    </div>
  );
}
