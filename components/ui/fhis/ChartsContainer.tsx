import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps, FhisChildrenProps } from "@/lib/design-system/types";

interface ChartsContainerProps extends FhisClassNameProps, FhisChildrenProps {
  title?: string;
  data?: number[];
}

export function ChartsContainer({ title, data, children, className }: ChartsContainerProps) {
  const bars = data ?? [40, 65, 30, 80, 55, 90, 45];
  const max = Math.max(...bars);

  return (
    <div className={cn("fhis-charts-container", className)}>
      {title && <div className="fhis-charts-container-title">{title}</div>}
      {children ?? (
        <div className="fhis-charts-container-body">
          {bars.map((val, i) => (
            <div
              key={i}
              className="fhis-chart-bar"
              style={{ height: `${(val / max) * 100}%` }}
              title={`${val}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
