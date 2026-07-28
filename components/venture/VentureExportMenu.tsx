"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { VentureProject } from "@/lib/domain/venture";
import { downloadVentureExport, downloadVentureZip, EXPORT_KINDS_UI } from "@/lib/export";
import { Button } from "@/components/ui/fhis/Button";
import { Panel } from "@/components/ui/fhis/Layout";
import { cn } from "@/lib/design-system/cn";

interface VentureExportMenuProps {
  venture: VentureProject;
}

export function VentureExportMenu({ venture }: VentureExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [zipping, setZipping] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleExport(kind: (typeof EXPORT_KINDS_UI)[number]["kind"]) {
    downloadVentureExport(venture, kind);
    setOpen(false);
  }

  async function handleZip() {
    setZipping(true);
    try {
      await downloadVentureZip(venture);
    } finally {
      setZipping(false);
      setOpen(false);
    }
  }

  return (
    <div className="venture-export-menu" ref={menuRef}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="venture-export-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Exportar
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </Button>

      {open && (
        <Panel className="venture-export-dropdown" role="menu">
          <span className="venture-export-group-label">Markdown</span>
          {EXPORT_KINDS_UI.map((item) => (
            <button
              key={item.kind}
              type="button"
              role="menuitem"
              className="venture-export-item"
              onClick={() => handleExport(item.kind)}
            >
              <strong>
                {item.label.replace("Exportar ", "")}
                <span className="venture-export-ext">.md</span>
              </strong>
              <span>{item.description}</span>
            </button>
          ))}

          <span className="venture-export-group-label">PDF y paquete</span>
          <Link
            href={`/venture/${venture.id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            className={cn("venture-export-item", "venture-export-link")}
            onClick={() => setOpen(false)}
          >
            <strong>Ver versión imprimible / PDF</strong>
            <span>Investor Pack con portada e índice — usar Imprimir → Guardar como PDF</span>
          </Link>

          <button
            type="button"
            role="menuitem"
            className="venture-export-item"
            onClick={handleZip}
            disabled={zipping}
          >
            <strong>
              Exportar paquete completo
              <span className="venture-export-ext">.zip</span>
            </strong>
            <span>
              {zipping
                ? "Generando paquete…"
                : "7 documentos Markdown + README (ZIP o descarga múltiple)"}
            </span>
          </button>
        </Panel>
      )}
    </div>
  );
}
