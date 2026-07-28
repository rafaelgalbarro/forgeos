"use client";

import Link from "next/link";
import { StoreView } from "@/components/skills-store/StoreView";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { listStoreItems, syncEcosystemStore } from "@/lib/ecosystem/store-engine";
import { useEffect, useState } from "react";

export function EcosystemStoreView() {
  const [ecosystemItems, setEcosystemItems] = useState<ReturnType<typeof listStoreItems>>([]);

  useEffect(() => {
    syncEcosystemStore();
    setEcosystemItems(listStoreItems().filter((i) => i.source === "ecosystem").slice(0, 12));
  }, []);

  return (
    <Stack gap="lg">
      <Container className="fhis-ecosystem-store">
        <SectionHeader
          title="Ecosystem Store"
          subtitle="RC9 — Packs nativos del ecosistema (sandbox — sin instalación real)"
        />
        <Panel>
          <SectionHeader title="Packs Ecosystem" subtitle="Extensiones RC9 sobre Skill Store RC4.8" />
          <div className="fhis-ecosystem-pack-list">
            {ecosystemItems.map((item) => (
              <div key={item.id} className="fhis-ecosystem-pack-row">
                <div>
                  <strong>{item.name}</strong>
                  <span className="fhis-ecosystem-pack-desc">v{item.version}</span>
                </div>
                <Badge variant="default">{item.packType}</Badge>
                <Badge variant="default">{item.priceLabel}</Badge>
                <Link href={`/lab/ecosystem?pack=${item.id}`}>Simular</Link>
              </div>
            ))}
          </div>
          <p className="fhis-ecosystem-links">
            <Link href="/marketplace">Marketplace →</Link>
            {" · "}
            <Link href="/lab/ecosystem">Demo CRM →</Link>
          </p>
        </Panel>
      </Container>
      <StoreView />
    </Stack>
  );
}
