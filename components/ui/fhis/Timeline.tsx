import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps } from "@/lib/design-system/types";

interface TimelineItem {
  title: string;
  time?: string;
  description?: string;
}

interface TimelineProps extends FhisClassNameProps {
  items: TimelineItem[];
}

export function Timeline({ items, className }: TimelineProps) {
  return (
    <div className={cn("fhis-timeline", className)}>
      {items.map((item, i) => (
        <div key={i} className="fhis-timeline-item">
          <div className="fhis-timeline-dot" />
          <div className="fhis-timeline-content">
            <div className="fhis-timeline-title">{item.title}</div>
            {item.time && <div className="fhis-timeline-time">{item.time}</div>}
            {item.description && <div className="fhis-timeline-desc">{item.description}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
