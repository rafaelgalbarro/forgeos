/** @deprecated Legacy wrapper — prefer @/components/ui/fhis/WorkerCard or Panel */
import type { DepartmentState, DepartmentStatus } from "@/lib/headquarters";
import { StatusChip, type StatusChipVariant } from "./StatusChip";

const STATUS_MAP: Record<DepartmentStatus, StatusChipVariant> = {
  working: "working",
  waiting: "waiting",
  blocked: "blocked",
  pending: "pending",
};

interface DepartmentCardProps {
  department: DepartmentState;
}

export function DepartmentCard({ department }: DepartmentCardProps) {
  return (
    <div className={`ui-dept-card ui-dept-${department.status}`}>
      <div className="ui-dept-head">
        <strong>{department.label}</strong>
        <StatusChip label={department.statusLabel} variant={STATUS_MAP[department.status]} />
      </div>
      <p>{department.detail}</p>
    </div>
  );
}
