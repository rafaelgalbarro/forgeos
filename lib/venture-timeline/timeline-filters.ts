/** Venture Timeline — filter events by department, category, and date (Epic 7.3). */

import type { TimelineEvent, TimelineFilterState } from "./types";

export const EMPTY_FILTERS: TimelineFilterState = {
  departments: [],
  categories: [],
};

export function applyTimelineFilters(
  events: TimelineEvent[],
  filters: TimelineFilterState
): TimelineEvent[] {
  let result = events;

  if (filters.departments.length > 0) {
    const deptSet = new Set(filters.departments);
    result = result.filter((e) => deptSet.has(e.department));
  }

  if (filters.categories.length > 0) {
    const catSet = new Set(filters.categories);
    result = result.filter((e) => catSet.has(e.category));
  }

  if (filters.dateRange?.from) {
    const from = new Date(filters.dateRange.from).getTime();
    result = result.filter((e) => new Date(e.timestamp).getTime() >= from);
  }

  if (filters.dateRange?.to) {
    const to = new Date(filters.dateRange.to).getTime();
    result = result.filter((e) => new Date(e.timestamp).getTime() <= to);
  }

  return result;
}

export function toggleFilterValue<T extends string>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

export function countActiveFilters(filters: TimelineFilterState): number {
  let count = 0;
  if (filters.departments.length > 0) count += 1;
  if (filters.categories.length > 0) count += 1;
  if (filters.dateRange?.from || filters.dateRange?.to) count += 1;
  return count;
}
