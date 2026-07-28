/** @deprecated Legacy wrapper — prefer @/components/ui/fhis/Status or Badge */
import clsx from "clsx";

export type StatusChipVariant = "working" | "waiting" | "blocked" | "pending" | "healthy" | "risk";

const VARIANT_CLASS: Record<StatusChipVariant, string> = {
  working: "ui-chip-working",
  waiting: "ui-chip-waiting",
  blocked: "ui-chip-blocked",
  pending: "ui-chip-pending",
  healthy: "ui-chip-working",
  risk: "ui-chip-blocked",
};

interface StatusChipProps {
  label: string;
  variant: StatusChipVariant;
  className?: string;
}

export function StatusChip({ label, variant, className }: StatusChipProps) {
  return (
    <span className={clsx("ui-status-chip", VARIANT_CLASS[variant], className)}>
      <span className="ui-status-dot" aria-hidden />
      {label}
    </span>
  );
}
