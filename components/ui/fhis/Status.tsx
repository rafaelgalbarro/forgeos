import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps, FhisStatus } from "@/lib/design-system/types";

interface StatusProps extends FhisClassNameProps {
  status: FhisStatus;
  label?: string;
}

const STATUS_LABELS: Record<FhisStatus, string> = {
  idle: "Inactivo",
  active: "Activo",
  success: "Completado",
  warning: "Atención",
  error: "Error",
  pending: "Pendiente",
};

export function Status({ status, label, className }: StatusProps) {
  return (
    <span className={cn("fhis-status", `fhis-status-${status}`, className)}>
      <span className="fhis-status-dot" />
      {label !== "" && (label ?? STATUS_LABELS[status])}
    </span>
  );
}
