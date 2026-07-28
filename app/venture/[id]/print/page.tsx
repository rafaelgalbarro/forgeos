"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { VenturePrintView } from "@/components/venture/VenturePrintView";
import { getVentureById } from "@/lib/store/ventures";
import type { VentureProject } from "@/lib/domain/venture";

export default function VenturePrintPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) ?? "";
  const [venture, setVenture] = useState<VentureProject | null>(null);

  useEffect(() => {
    const found = getVentureById(id);
    if (!found || found.status !== "ready" || !found.sections.length) {
      router.replace("/");
      return;
    }
    setVenture(found);
  }, [id, router]);

  if (!venture) {
    return (
      <div style={{ padding: 48, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        Cargando documento imprimible…
      </div>
    );
  }

  return <VenturePrintView venture={venture} />;
}
