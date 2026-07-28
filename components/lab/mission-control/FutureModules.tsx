"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import { Grid, Panel } from "@/components/ui/fhis/Layout";
import { SectionTitle } from "./shared";

const FUTURE_MODULES = [
  { name: "Build Engine", epic: "3.3", description: "Ejecución de build automatizado post-decisión ejecutiva." },
  { name: "Marketing AI", epic: "3.4", description: "Generación de campañas y GTM intelligence." },
  { name: "Finance AI", epic: "3.5", description: "Modelado financiero y unit economics." },
  { name: "Legal AI", epic: "3.6", description: "Revisión legal y compliance automatizado." },
  { name: "Forge Capital", epic: "3.7", description: "Capital allocation y portfolio optimization." },
  { name: "Workers", epic: "3.8", description: "Agentes operativos de ejecución distribuida." },
];

export function FutureModules() {
  return (
    <Panel>
      <SectionTitle>Future Modules</SectionTitle>
      <Grid cols={3} gap="md">
        {FUTURE_MODULES.map((mod) => (
          <div
            key={mod.name}
            style={{
              padding: "var(--fhis-space-3)",
              border: "1px dashed var(--fhis-color-border, #333)",
              borderRadius: "var(--fhis-radius-sm, 4px)",
              opacity: 0.65,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <strong style={{ fontSize: "0.875rem" }}>{mod.name}</strong>
              <Badge variant="default">Coming Soon</Badge>
            </div>
            <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.7 }}>{mod.description}</p>
            <p style={{ margin: "8px 0 0", fontSize: "0.7rem", opacity: 0.5 }}>Epic {mod.epic}</p>
          </div>
        ))}
      </Grid>
    </Panel>
  );
}
