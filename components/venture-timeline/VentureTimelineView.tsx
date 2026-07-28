"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { VentureProject } from "@/lib/domain/venture";
import {
  buildVentureTimelineSnapshot,
  applyTimelineFilters,
  searchTimelineEvents,
  groupTimelineByDate,
  groupTimelineByDepartment,
  EMPTY_FILTERS,
  type TimelineFilterState,
} from "@/lib/venture-timeline";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { EmptyState } from "@/components/ui/fhis/EmptyState";
import { cn } from "@/lib/design-system/cn";
import { TimelineFilters } from "./TimelineFilters";
import { TimelineSearchBar } from "./TimelineSearchBar";
import { TimelineGitHubStyle } from "./TimelineGitHubStyle";
import { TimelineDepartmentGroupSection } from "./TimelineDepartmentGroup";

interface VentureTimelineViewProps {
  venture: VentureProject;
}

export function VentureTimelineView({ venture }: VentureTimelineViewProps) {
  const [filters, setFilters] = useState<TimelineFilterState>(EMPTY_FILTERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupByDepartment, setGroupByDepartment] = useState(false);

  const snapshot = useMemo(
    () => buildVentureTimelineSnapshot(venture),
    [venture]
  );

  const displayedEvents = useMemo(() => {
    const filtered = applyTimelineFilters(snapshot.events, filters);
    return searchTimelineEvents(filtered, searchQuery);
  }, [snapshot.events, filters, searchQuery]);

  const dateGroups = useMemo(
    () => groupTimelineByDate(displayedEvents),
    [displayedEvents]
  );

  const departmentGroups = useMemo(
    () => groupTimelineByDepartment(displayedEvents),
    [displayedEvents]
  );

  return (
    <div className="fhis-vtl venture-workspace">
      <header className="fhis-venture-topbar">
        <Link href="/dashboard" className="fhis-sidebar-logo">
          Forge<span>OS</span>
        </Link>
        <div className="venture-topbar-center">
          <h1 style={{ margin: 0, fontSize: "var(--fhis-text-lg)" }}>{venture.name}</h1>
          <Badge variant="blue">Venture Timeline</Badge>
        </div>
        <div
          className="venture-topbar-actions"
          style={{ display: "flex", gap: "var(--fhis-space-2)", alignItems: "center" }}
        >
          <Link
            href={`/venture/${venture.id}`}
            className={cn("fhis-btn", "fhis-btn-secondary", "fhis-btn-sm")}
          >
            ← Workspace
          </Link>
          <Link href="/projects" className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-sm")}>
            Empresas
          </Link>
        </div>
      </header>

      <div className="fhis-vtl-layout">
        <aside className="fhis-vtl-sidebar">
          <TimelineFilters filters={filters} onChange={setFilters} />
        </aside>

        <main className="fhis-vtl-main">
          <Panel>
            <SectionHeader
              title="Historial del venture"
              subtitle="GitHub-style timeline con filtros, búsqueda y agrupación por departamento"
            />

            <div className="fhis-vtl-toolbar">
              <TimelineSearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                resultCount={displayedEvents.length}
              />
              <button
                type="button"
                className={cn(
                  "fhis-btn",
                  "fhis-btn-sm",
                  groupByDepartment ? "fhis-btn-primary" : "fhis-btn-ghost"
                )}
                onClick={() => setGroupByDepartment((v) => !v)}
              >
                {groupByDepartment ? "Por fecha" : "Por departamento"}
              </button>
            </div>

            <div className="fhis-vtl-meta">
              <Badge variant="accent">{displayedEvents.length} eventos</Badge>
              <Badge variant="default">{snapshot.sources.length} fuentes</Badge>
              <span style={{ color: "var(--fhis-color-text-muted)", fontSize: "var(--fhis-text-xs)" }}>
                Actualizado {new Date(snapshot.builtAt).toLocaleString("es-ES")}
              </span>
            </div>

            {displayedEvents.length === 0 ? (
              <EmptyState
                title="Sin eventos"
                description="Ajusta los filtros o continúa avanzando el venture para generar historial."
              />
            ) : groupByDepartment ? (
              <div className="fhis-vtl-dept-groups">
                {departmentGroups.map((group) => (
                  <TimelineDepartmentGroupSection key={group.department} group={group} />
                ))}
              </div>
            ) : (
              <TimelineGitHubStyle dateGroups={dateGroups} />
            )}
          </Panel>
        </main>
      </div>
    </div>
  );
}
