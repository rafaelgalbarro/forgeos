import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps } from "@/lib/design-system/types";
import { Badge } from "./Badge";

interface VentureCardProps extends FhisClassNameProps {
  title: string;
  description?: string;
  tags?: string[];
}

export function VentureCard({ title, description, tags, className }: VentureCardProps) {
  return (
    <div className={cn("fhis-venture-card", className)}>
      <div className="fhis-venture-card-title">{title}</div>
      {description && <div className="fhis-venture-card-desc">{description}</div>}
      {tags && tags.length > 0 && (
        <div className="fhis-venture-card-meta">
          {tags.map((tag) => (
            <Badge key={tag} variant="accent">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
