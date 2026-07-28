"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { VentureTimelineView } from "@/components/venture-timeline/VentureTimelineView";
import { getVentureById } from "@/lib/store/ventures";
import type { VentureProject } from "@/lib/domain/venture";

export default function VentureTimelinePage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) ?? "";
  const [venture, setVenture] = useState<VentureProject | null>(null);

  useEffect(() => {
    const found = getVentureById(id);
    if (!found) {
      router.replace("/");
      return;
    }
    setVenture(found);
  }, [id, router]);

  if (!venture) {
    return (
      <div className="studio">
        <div className="loading-state">Cargando timeline...</div>
      </div>
    );
  }

  return <VentureTimelineView venture={venture} />;
}
