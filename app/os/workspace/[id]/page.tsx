"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { VentureWorkspaceView } from "@/components/venture-workspace/VentureWorkspaceView";
import { VentureWorkspace } from "@/components/venture/VentureWorkspace";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { resolveVenture } from "@/lib/venture/resolve-venture";
import { ensureVandlSeeded } from "@/lib/store/vandl-seed";
import { isVandlVentureId } from "@/lib/fixtures/vandl-venture";
import type { VentureProject } from "@/lib/domain/venture";

export default function OsWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) ?? "";
  const [venture, setVenture] = useState<VentureProject | null>(null);
  const [useLegacy, setUseLegacy] = useState(false);

  useEffect(() => {
    ensureVandlSeeded();
    const found = resolveVenture(id);
    if (!found) {
      router.replace("/os/portfolio");
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
    return (
      <OsModuleFrame title="Workspace">
        <p>Cargando workspace…</p>
      </OsModuleFrame>
    );
  }

  return (
    <OsModuleFrame title={venture.name} description="Venture Workspace">
      {useLegacy ? (
        <VentureWorkspace venture={venture} />
      ) : (
        <VentureWorkspaceView venture={venture} />
      )}
    </OsModuleFrame>
  );
}
