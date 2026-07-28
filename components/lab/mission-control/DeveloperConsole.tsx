"use client";

import { useState } from "react";
import { Button } from "@/components/ui/fhis/Button";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import type { DeveloperConsoleData } from "./types";
import { JsonBlock, SectionTitle } from "./shared";

interface Props {
  data: DeveloperConsoleData | null;
}

export function DeveloperConsole({ data }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Panel>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionTitle className="fhis-mb-0">Developer Console</SectionTitle>
        <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? "Ocultar" : "Mostrar"}
        </Button>
      </div>

      {open && data && (
        <Stack gap="md" style={{ marginTop: "var(--fhis-space-3)" }}>
          <div>
            <h3 style={{ fontSize: "0.75rem", textTransform: "uppercase", opacity: 0.6 }}>CEO Response</h3>
            <JsonBlock data={data.ceoResponse} />
          </div>
          <div>
            <h3 style={{ fontSize: "0.75rem", textTransform: "uppercase", opacity: 0.6 }}>
              Board Responses ({data.boardResponses.length})
            </h3>
            <JsonBlock data={data.boardResponses} />
          </div>
          <div>
            <h3 style={{ fontSize: "0.75rem", textTransform: "uppercase", opacity: 0.6 }}>Consensus Output</h3>
            <JsonBlock data={data.consensusOutput} />
          </div>
          <div>
            <h3 style={{ fontSize: "0.75rem", textTransform: "uppercase", opacity: 0.6 }}>Validator Warnings</h3>
            <JsonBlock data={data.validatorWarnings} />
          </div>
          <div>
            <h3 style={{ fontSize: "0.75rem", textTransform: "uppercase", opacity: 0.6 }}>
              Fallback: {data.fallbackUsed ? "Sí" : "No"}
            </h3>
          </div>
          <div>
            <h3 style={{ fontSize: "0.75rem", textTransform: "uppercase", opacity: 0.6 }}>Memory Writes</h3>
            <JsonBlock data={data.memoryWrites} />
          </div>
          <div>
            <h3 style={{ fontSize: "0.75rem", textTransform: "uppercase", opacity: 0.6 }}>Decision Writes</h3>
            <JsonBlock data={data.decisionWrites} />
          </div>
        </Stack>
      )}

      {open && !data && (
        <p style={{ opacity: 0.7, marginTop: "var(--fhis-space-3)" }}>Ejecuta el runtime para ver datos de desarrollo.</p>
      )}
    </Panel>
  );
}
