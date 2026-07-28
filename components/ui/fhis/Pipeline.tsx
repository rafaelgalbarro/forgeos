import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps } from "@/lib/design-system/types";

interface PipelineStage {
  title: string;
  count: number;
  active?: boolean;
}

interface PipelineProps extends FhisClassNameProps {
  stages: PipelineStage[];
}

export function Pipeline({ stages, className }: PipelineProps) {
  return (
    <div className={cn("fhis-pipeline", className)}>
      {stages.map((stage, i) => (
        <div
          key={i}
          className={cn("fhis-pipeline-stage", stage.active && "fhis-pipeline-stage-active")}
        >
          <div className="fhis-pipeline-stage-title">{stage.title}</div>
          <div className="fhis-pipeline-stage-count">{stage.count}</div>
        </div>
      ))}
    </div>
  );
}
