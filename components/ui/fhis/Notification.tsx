import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps } from "@/lib/design-system/types";

interface NotificationProps extends FhisClassNameProps {
  title: string;
  body?: string;
  variant?: "default" | "info" | "warning" | "error";
}

export function Notification({ title, body, variant = "default", className }: NotificationProps) {
  return (
    <div
      className={cn(
        "fhis-notification",
        variant !== "default" && `fhis-notification-${variant}`,
        className
      )}
    >
      <div>
        <div className="fhis-notification-title">{title}</div>
        {body && <div className="fhis-notification-body">{body}</div>}
      </div>
    </div>
  );
}
