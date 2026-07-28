# CEO Workspace (Epic 7.2)

Permanent **Director General** executive office at `/ceo` — not a chatbot.

## Experience

- Natural prose briefing from `CeoDirectorMessage` (single executive block)
- Structured panels: Executive Brief, Prioridades, Riesgos, Oportunidades, Recomendaciones, Próximas decisiones, Estado del portfolio, Agenda del día
- Source badge: **AI Generated** / **Heuristic** / **Mock**

## Data flow

1. Client loads ventures from `lib/store/ventures`
2. Instant heuristic render via `buildCeoWorkspaceDataHeuristic`
3. `POST /api/ceo-workspace` runs `buildCeoWorkspaceData` → `getCeoOfficeBriefing` → `runExecutiveIntelligence`
4. UI updates when server response arrives

## Isolation

Executive runtime is imported only on `/ceo` route and its API. Dashboard is unchanged.

## Files

| Layer | Path |
|-------|------|
| Types & assembly | `lib/ceo-workspace/` |
| UI | `components/ceo-workspace/` |
| Route | `app/ceo/page.tsx` |
| API | `app/api/ceo-workspace/route.ts` |
