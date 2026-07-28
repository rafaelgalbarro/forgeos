"use client";

import Link from "next/link";
import type { VentureProject } from "@/lib/domain/venture";
import { buildVenturePrintData } from "@/lib/export/pdf";
import { PRINT_STYLES } from "@/lib/export/pdf/pdf-styles";
import { formatExportDate } from "@/lib/export/export-utils";
import { triggerBrowserPrint } from "@/lib/export/pdf";
import { Button } from "@/components/ui/fhis/Button";
import { cn } from "@/lib/design-system/cn";

interface VenturePrintViewProps {
  venture: VentureProject;
}

export function VenturePrintView({ venture }: VenturePrintViewProps) {
  const data = buildVenturePrintData(venture);
  const dateLabel = formatExportDate(data.generatedAt);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      <div className="no-print print-toolbar" style={{ display: "flex", gap: "var(--fhis-space-3)", padding: "var(--fhis-space-4)", alignItems: "center" }}>
        <Link href={`/venture/${venture.id}`} className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-sm")}>
          ← Volver al workspace
        </Link>
        <Button type="button" variant="primary" size="sm" onClick={() => triggerBrowserPrint()}>
          Imprimir / Guardar como PDF
        </Button>
      </div>

      <div className="print-doc">
        <header className="cover">
          <div className="cover-brand">ForgeOS · Investor Pack</div>
          <h1>{data.ventureName}</h1>
          <p>
            {venture.ideaText.slice(0, 280)}
            {venture.ideaText.length > 280 ? "…" : ""}
          </p>
          <div className="cover-meta">
            <p><strong>Categoría:</strong> {data.category}</p>
            <p><strong>Cliente objetivo:</strong> {data.targetAudience}</p>
            <p><strong>Generado:</strong> {dateLabel}</p>
          </div>
          <div className="cover-score">
            <span>Venture Score</span>
            <strong>{data.ventureScore}</strong>
            <p>
              Recomendación: {data.recommendation} · Confianza: {data.confidence}
            </p>
          </div>
        </header>

        <nav className="toc">
          <h2>Índice</h2>
          <ol>
            {data.toc.map((item) => (
              <li key={item.id}>
                <a href={`#section-${item.id}`}>
                  {item.number}. {item.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {data.sections.map((section) => (
          <section key={section.id} className="section" id={`section-${section.id}`}>
            <div className="section-header">
              <span className="section-num">{String(section.number).padStart(2, "0")}</span>
              <h2>{section.title}</h2>
            </div>
            {section.isPending ? (
              <p className="pending">Pendiente de completar</p>
            ) : (
              <div className="section-body">{section.body}</div>
            )}
          </section>
        ))}

        <footer className="footer">
          Documento generado por ForgeOS App Factory · {dateLabel} · Venture ID {data.ventureId}
          <br />
          Simulación heurística — no constituye asesoramiento financiero.
        </footer>
      </div>
    </>
  );
}
