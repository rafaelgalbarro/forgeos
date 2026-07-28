"use client";

import { useState } from "react";
import Link from "next/link";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import {
  createCommercialApiKey,
  listCommercialApiKeys,
  revokeCommercialApiKey,
} from "@/lib/commercial";
import { LaunchNav } from "@/components/launch/LaunchNav";

export function ApiKeysPanel() {
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const [newKeyName, setNewKeyName] = useState("");

  const keys = listCommercialApiKeys();

  function handleCreate() {
    if (!newKeyName.trim()) return;
    createCommercialApiKey(newKeyName.trim());
    setNewKeyName("");
    refresh();
  }

  return (
    <div className="fhis-launch-page">
      <LaunchNav />
      <Container>
        <Stack gap="lg">
          <SectionHeader
            title="API Keys"
            subtitle="Gestión de claves — localStorage (dry-run)"
          />

          <Panel>
            <h3>Crear nueva clave</h3>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input
                type="text"
                placeholder="Nombre de la clave"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="fhis-input"
                style={{ flex: 1 }}
              />
              <Button size="sm" onClick={handleCreate}>Crear</Button>
            </div>
            <p style={{ marginTop: 8, fontSize: "0.875rem", opacity: 0.8 }}>
              Requiere plan Business o superior para uso en producción.
            </p>
          </Panel>

          <Panel>
            <h3>Claves activas ({keys.length})</h3>
            {keys.length === 0 ? (
              <p>No hay claves API. Crea una arriba.</p>
            ) : (
              <ul>
                {keys.map((k) => (
                  <li key={k.id} style={{ marginBottom: 12 }}>
                    <strong>{k.name}</strong> — <code>{k.prefix}…</code>{" "}
                    <Badge variant="default">{k.status}</Badge>
                    <br />
                    <span style={{ fontSize: "0.875rem" }}>
                      Scopes: {k.scopes.join(", ")} · Creada: {k.createdAt.slice(0, 10)}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      style={{ marginLeft: 8 }}
                      onClick={() => { revokeCommercialApiKey(k.id); refresh(); }}
                    >
                      Revocar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <p>
            <Link href="/docs">Documentación API →</Link>
            {" · "}
            <Link href="/billing">Facturación →</Link>
          </p>
        </Stack>
      </Container>
    </div>
  );
}
