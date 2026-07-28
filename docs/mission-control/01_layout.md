# Mission Control Layout

## Visual hierarchy

1. **Header** — Epic badge, venture ID, title, description
2. **Run control** — "Ejecutar Executive Runtime" button
3. **Execution Timeline** — live phase indicator during run
4. **Status + Brief** — top-level executive signals
5. **Board + Consensus** — debate and agreement
6. **Decision Graph + Memory** — structural outputs
7. **Telemetry + Observability** — ops metrics
8. **Future Modules** — coming soon placeholders
9. **Developer Console** — collapsed by default

## Design principles

- Executive information first; JSON only behind toggles ("Ver detalles técnicos", "Ver respuesta técnica", "Ver razonamiento")
- Color coding: green (success/high confidence), yellow (warning/medium), red (error/low)
- FHIS `Panel`, `Grid`, `Stack`, `Container` for layout consistency
- Mission Control aesthetic: dense engineering console, not consumer dashboard

## Developer Console

Hidden by default. Expands to show:

- CEO Response (raw)
- Board Responses
- Consensus Output
- Validator Warnings
- Fallback flag
- Memory Writes
- Decision Writes

## File map

```
components/lab/mission-control/
  MissionControlConsole.tsx   # composer
  shared.tsx                  # JsonBlock, toggles, formatters
  types.ts                    # phase + observability types
  observability-store.ts      # in-memory session log
```
