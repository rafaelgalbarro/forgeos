/** @deprecated Legacy wrapper — prefer @/components/ui/fhis/Badge */
import type { LiveDepartment } from "@/lib/live";
import clsx from "clsx";

const DEPT_CLASS: Record<LiveDepartment, string> = {
  ceo: "ui-badge-ceo",
  research: "ui-badge-research",
  product: "ui-badge-product",
  marketing: "ui-badge-marketing",
  simulator: "ui-badge-simulator",
  cto: "ui-badge-cto",
  ux: "ui-badge-ux",
  discovery: "ui-badge-discovery",
};

interface ActivityBadgeProps {
  department: LiveDepartment;
  label: string;
}

export function ActivityBadge({ department, label }: ActivityBadgeProps) {
  return (
    <span className={clsx("ui-activity-badge", DEPT_CLASS[department])}>{label}</span>
  );
}
