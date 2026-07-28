"use client";

import type { TimelineCategory, TimelineDepartment, TimelineFilterState } from "@/lib/venture-timeline";
import {
  TIMELINE_CATEGORIES,
  TIMELINE_DEPARTMENTS,
  DEPARTMENT_LABELS,
  toggleFilterValue,
  countActiveFilters,
} from "@/lib/venture-timeline";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { cn } from "@/lib/design-system/cn";

interface TimelineFiltersProps {
  filters: TimelineFilterState;
  onChange: (filters: TimelineFilterState) => void;
}

export function TimelineFilters({ filters, onChange }: TimelineFiltersProps) {
  const activeCount = countActiveFilters(filters);

  function toggleDepartment(dept: TimelineDepartment) {
    onChange({
      ...filters,
      departments: toggleFilterValue(filters.departments, dept),
    });
  }

  function toggleCategory(cat: TimelineCategory) {
    onChange({
      ...filters,
      categories: toggleFilterValue(filters.categories, cat),
    });
  }

  function setDateField(field: "from" | "to", value: string) {
    onChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: value || undefined,
      },
    });
  }

  function clearFilters() {
    onChange({ departments: [], categories: [], dateRange: undefined });
  }

  return (
    <Panel className="fhis-vtl-filters">
      <div className="fhis-vtl-filters-header">
        <SectionHeader
          title="Filtros"
          subtitle={activeCount > 0 ? `${activeCount} activo(s)` : "Todos los eventos"}
        />
        {activeCount > 0 && (
          <button type="button" className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-sm")} onClick={clearFilters}>
            Limpiar
          </button>
        )}
      </div>

      <div className="fhis-vtl-filter-block">
        <span className="fhis-vtl-filter-label">Departamento</span>
        <div className="fhis-vtl-filter-chips">
          {TIMELINE_DEPARTMENTS.map((dept) => (
            <button
              key={dept}
              type="button"
              className={cn(
                "fhis-vtl-chip",
                filters.departments.includes(dept) && "fhis-vtl-chip-active"
              )}
              onClick={() => toggleDepartment(dept)}
            >
              {DEPARTMENT_LABELS[dept]}
            </button>
          ))}
        </div>
      </div>

      <div className="fhis-vtl-filter-block">
        <span className="fhis-vtl-filter-label">Categoría</span>
        <div className="fhis-vtl-filter-chips">
          {TIMELINE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={cn(
                "fhis-vtl-chip",
                filters.categories.includes(cat) && "fhis-vtl-chip-active"
              )}
              onClick={() => toggleCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="fhis-vtl-filter-block">
        <span className="fhis-vtl-filter-label">Rango de fechas</span>
        <div className="fhis-vtl-date-inputs">
          <label>
            <span>Desde</span>
            <input
              type="date"
              value={filters.dateRange?.from?.slice(0, 10) ?? ""}
              onChange={(e) => setDateField("from", e.target.value)}
              className="fhis-input"
            />
          </label>
          <label>
            <span>Hasta</span>
            <input
              type="date"
              value={filters.dateRange?.to?.slice(0, 10) ?? ""}
              onChange={(e) => setDateField("to", e.target.value)}
              className="fhis-input"
            />
          </label>
        </div>
      </div>
    </Panel>
  );
}
