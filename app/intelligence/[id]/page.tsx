"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { IntelligenceReportView } from "@/components/studio/IntelligenceReportView";
import { getVentureById } from "@/lib/store/ventures";
import type { VentureProject } from "@/lib/domain/venture";

export default function IntelligencePage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) ?? "";
  const [venture, setVenture] = useState<VentureProject | null>(null);

  useEffect(() => {
    const found = getVentureById(id);
    if (!found || !found.intelligenceReport) {
      router.replace("/");
      return;
    }
    if (found.status === "building" || found.status === "ready") {
      router.replace(found.status === "ready" ? `/venture/${id}` : `/build/${id}`);
      return;
    }
    setVenture(found);
  }, [id, router]);

  if (!venture?.intelligenceReport) {
    return <div className="studio"><div className="loading-state">Analizando...</div></div>;
  }

  return <IntelligenceReportView venture={venture} />;
}
