"use client";

import Link from "next/link";
import { useOsShell } from "@/lib/os/shell-context";

export function OsFloatingPanels() {
  const { layout, minimizePanel, dismissPanel } = useOsShell();
  const floating = layout.panels.filter((p) => p.id !== "panel-main");

  if (floating.length === 0) return null;

  return (
    <div className="fhis-os-floating-layer" aria-live="polite">
      {floating.map((panel) => (
        <div
          key={panel.id}
          className={panel.minimized ? "fhis-os-panel fhis-os-panel-min" : "fhis-os-panel"}
          style={{ zIndex: panel.zIndex }}
        >
          <div className="fhis-os-panel-titlebar">
            <Link href={panel.href}>{panel.title}</Link>
            <div className="fhis-os-panel-actions">
              <button type="button" onClick={() => minimizePanel(panel.id)} aria-label="Minimizar">
                −
              </button>
              <button type="button" onClick={() => dismissPanel(panel.id)} aria-label="Cerrar">
                ×
              </button>
            </div>
          </div>
          {!panel.minimized && (
            <div className="fhis-os-panel-body">
              <p className="fhis-os-panel-hint">Panel flotante — {panel.moduleId}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
