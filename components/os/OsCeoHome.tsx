"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getVentures } from "@/lib/store/ventures";
import { ensureVandlSeeded } from "@/lib/store/vandl-seed";
import { buildOsCeoHomeData, type OsCeoHomeData } from "@/lib/os";
import { cn } from "@/lib/design-system/cn";
import { Card } from "@/components/ui/fhis/Card";

const BLOCK_LABELS: Record<string, string> = {
  greeting: "Director General",
  absence: "Mientras estabas fuera",
  research: "Research",
  marketing: "Marketing",
  build: "Build",
  board: "Board",
  today: "Hoy",
};

export function OsCeoHome() {
  const [data, setData] = useState<OsCeoHomeData | null>(null);

  useEffect(() => {
    ensureVandlSeeded();
    setData(buildOsCeoHomeData(getVentures()));
  }, []);

  if (!data) {
    return (
      <Card className="fhis-os-ceo-home fhis-os-ceo-home-loading">
        <p>Preparando briefing del Director General…</p>
      </Card>
    );
  }

  const greeting = data.blocks.find((b) => b.kind === "greeting");
  const rest = data.blocks.filter((b) => b.kind !== "greeting");

  return (
    <section className="fhis-os-ceo-home">
      <Card className="fhis-os-ceo-home-hero">
        <p className="fhis-os-ceo-kicker">Director General</p>
        <h1 className="fhis-os-ceo-greeting">{greeting?.text}</h1>
        <div className="fhis-os-ceo-blocks">
          {rest.map((block) => (
            <div key={block.kind} className="fhis-os-ceo-block">
              <span className="fhis-os-ceo-block-label">{BLOCK_LABELS[block.kind]}</span>
              <p>{block.text}</p>
            </div>
          ))}
        </div>
        <div className="fhis-os-ceo-actions">
          <Link href="/os/ceo" className={cn("fhis-btn", "fhis-btn-primary", "fhis-btn-md")}>
            Abrir CEO Office
          </Link>
          <Link href="/os/portfolio" className={cn("fhis-btn", "fhis-btn-secondary", "fhis-btn-md")}>
            Ver Portfolio
          </Link>
        </div>
      </Card>
    </section>
  );
}
