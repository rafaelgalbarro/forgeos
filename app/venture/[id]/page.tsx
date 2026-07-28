"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { VentureWorkspaceView } from "@/components/venture-workspace/VentureWorkspaceView";
import { VentureWorkspace } from "@/components/venture/VentureWorkspace";
import { resolveVenture } from "@/lib/venture/resolve-venture";
import { ensureVandlSeeded } from "@/lib/store/vandl-seed";
import { isVandlVentureId } from "@/lib/fixtures/vandl-venture";
import type { VentureProject } from "@/lib/domain/venture";

export default function VenturePage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) ?? "";
  const [venture, setVenture] = useState<VentureProject | null>(null);
  const [useLegacy, setUseLegacy] = useState(false);

  useEffect(() => {
    ensureVandlSeeded();
    const found = resolveVenture(id);
    if (!found) {
      router.replace("/");
      return;
    }
    if (isVandlVentureId(id) || found.status === "ready") {
      setVenture(found);
      setUseLegacy(!isVandlVentureId(id) && found.sections.length > 0 && found.status === "ready");
    } else {
      router.replace(`/intelligence/${id}`);
    }
  }, [id, router]);

  if (!venture) {
    return <div className="studio"><div className="loading-state">Cargando workspace...</div></div>;
  }

  if (useLegacy) {
    return <VentureWorkspace venture={venture} />;
  }

  return <VentureWorkspaceView venture={venture} />;
}
