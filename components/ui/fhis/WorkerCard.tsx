import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps } from "@/lib/design-system/types";
import { Status } from "./Status";

interface WorkerCardProps extends FhisClassNameProps {
  name: string;
  role: string;
  icon?: string;
  status?: "idle" | "active" | "success" | "warning" | "error" | "pending";
}

export function WorkerCard({ name, role, icon = "⚙", status = "active", className }: WorkerCardProps) {
  return (
    <div className={cn("fhis-worker-card", className)}>
      <span className="fhis-worker-card-icon">{icon}</span>
      <div className="fhis-worker-card-info">
        <div className="fhis-worker-card-name">{name}</div>
        <div className="fhis-worker-card-status">{role}</div>
      </div>
      <Status status={status} label="" />
    </div>
  );
}
