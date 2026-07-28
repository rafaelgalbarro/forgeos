import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

export default function CompanyNotFound() {
  return (
    <div style={{ padding: 28, maxWidth: 720 }}>
      <EmptyState
        title="Company not found"
        description="No existe un venture con ese id en el store V2 (.forgeos/v2-store)."
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <Link href="/company" className="fhis-btn fhis-btn-primary">
            Company hub
          </Link>
          <Link href="/mission-control" className="fhis-btn">
            Mission Control
          </Link>
        </div>
      </EmptyState>
    </div>
  );
}
