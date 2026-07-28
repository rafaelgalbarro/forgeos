# Background Jobs

Pattern: validate → create Execution → enqueue → return status → UI polls/events.

Moved off main request:

- Asset generation
- Screenshots
- Reports
- Extensive analysis
- Non-critical QA
- Compilations
- Previews
- Graph updates
- Recomputations

Uses load planner with BACKGROUND/LOW_PRIORITY task types. UI updates via specific events (not global refetch).
