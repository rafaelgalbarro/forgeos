import type { HeadquartersSnapshot } from "@/lib/headquarters";
import { DepartmentCard } from "@/components/ui";

interface HeadquartersPanelProps {
  data: HeadquartersSnapshot;
}

export function HeadquartersPanel({ data }: HeadquartersPanelProps) {
  return (
    <section className="ceo-headquarters glass">
      <div className="ceo-section-head">
        <h2>Headquarters</h2>
        <span className="ceo-hq-stats">
          {data.activeCount} trabajando · {data.waitingCount} esperando decisión
        </span>
      </div>
      <div className="ceo-hq-grid">
        {data.departments.map((dept) => (
          <DepartmentCard key={dept.id} department={dept} />
        ))}
      </div>
    </section>
  );
}
