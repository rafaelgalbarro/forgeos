"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { KnowledgeHubView } from "@/components/knowledge-hub/KnowledgeHubView";
import { resolveVenture } from "@/lib/venture/resolve-venture";
import { ensureVandlSeeded } from "@/lib/store/vandl-seed";
import type { VentureProject } from "@/lib/domain/venture";

export default function VentureKnowledgePage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) ?? "";
  const [venture, setVenture] = useState<VentureProject | null>(null);

  useEffect(() => {
    ensureVandlSeeded();
    const found = resolveVenture(id);
    if (!found) {
      router.replace("/");
      return;
    }
    setVenture(found);
  }, [id, router]);

  if (!venture) {
    return (
      <div className="studio">
        <div className="loading-state">Cargando knowledge hub...</div>
      </div>
    );
  }

  return <KnowledgeHubView venture={venture} />;
}
