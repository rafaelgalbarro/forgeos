/** @deprecated Legacy wrapper — prefer Link with fhis-btn classes or @/components/ui/fhis/Button */
import Link from "next/link";
import { cn } from "@/lib/design-system/cn";

interface ActionButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
}

export function ActionButton({
  href,
  children,
  variant = "primary",
  className,
}: ActionButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "fhis-btn",
        variant === "primary" ? "fhis-btn-primary" : "fhis-btn-ghost",
        "fhis-btn-md",
        "ui-action-btn",
        className
      )}
    >
      {children}
    </Link>
  );
}
