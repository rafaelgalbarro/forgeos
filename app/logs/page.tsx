"use client";

import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { Panel, SectionHeader } from "@/components/ui/fhis";
import { listErrorLogs, formatStructuredLog, serializeLog } from "@/lib/production-readiness";
import { useEffect, useState } from "react";

export default function LogsPage() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const errors = listErrorLogs();
    const structured = formatStructuredLog("info", "Production logs viewer initialized", {
      service: "production-readiness",
    });
    const out = [
      serializeLog(structured),
      ...errors.map((e) =>
        serializeLog(
          formatStructuredLog(
            e.severity === "critical" ? "error" : e.severity === "warning" ? "warn" : "info",
            e.message,
            { service: e.source, metadata: { count: e.count } }
          )
        )
      ),
    ];
    setLines(out);
  }, []);

  return (
    <OsModuleFrame title="Logs" description="Agregación de logs estructurados y errores">
      <Panel className="fhis-prod-logs">
        <SectionHeader title="Log stream" subtitle="Stub — activar ENABLE_STRUCTURED_LOGGING=true para JSON" />
        <pre className="fhis-prod-pre">{lines.join("\n") || "Sin entradas."}</pre>
      </Panel>
    </OsModuleFrame>
  );
}
