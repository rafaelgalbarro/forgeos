import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps } from "@/lib/design-system/types";

interface ExecutiveCardProps extends FhisClassNameProps {
  name: string;
  role: string;
  avatar?: string;
  children?: React.ReactNode;
}

export function ExecutiveCard({ name, role, avatar, children, className }: ExecutiveCardProps) {
  return (
    <div className={cn("fhis-executive-card", className)}>
      <div className="fhis-executive-card-header">
        <div className="fhis-executive-card-avatar">{avatar ?? name.charAt(0)}</div>
        <div>
          <div className="fhis-executive-card-name">{name}</div>
          <div className="fhis-executive-card-role">{role}</div>
        </div>
      </div>
      {children && <div className="fhis-executive-card-body">{children}</div>}
    </div>
  );
}
