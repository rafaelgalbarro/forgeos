# ForgeOS OS RC2 — COMPLETADO

ForgeOS OS es el sistema operativo unificado de la plataforma. El fundador nunca cambia de aplicación: todo ocurre dentro de `/os`.

## Epics

| Epic | Módulo | Ruta |
|------|--------|------|
| 8.0 | OS Shell (TopBar, Dock, Sidebar, Workspace, Panels, Tabs) | `/os` |
| 8.1 | Navigation Engine (breadcrumbs, pinned, history) | `lib/os/navigation-engine.ts` |
| 8.2 | Desktop + Widgets | `/os` |
| 8.3 | CEO Home — Director General | `/os` |
| 8.4 | Universal Search (Ctrl+F) | overlay en shell |
| 8.5 | Command Palette (Ctrl+K) | overlay en shell |
| 8.6 | Notification Center | overlay en shell |
| 8.7 | Workspace Manager | `lib/os/workspace-manager.ts` |
| 8.8 | OS Integration | `/os/*` módulos |

## Arquitectura

```
app/os/           — rutas del sistema operativo
lib/os/           — navegación, búsqueda, comandos, notificaciones, workspace
components/os/    — ForgeOSShell y UI del OS
styles/fhis/os.css — estilos FHIS del shell
```

## Módulos founder-facing

CEO · Portfolio · Workspace · Creator · Build · Knowledge · Capital · Marketplace · Analytics · Calendar · Settings

**Oculto al fundador:** Runtime, Event Bus, Workers (accesibles solo vía Labs en `/os/labs`).

## Integración

- `AppShell` detecta `/os/*` y renderiza `ForgeOSShell`
- Rutas legacy (`/founder`, `/ceo`, `/creator`, `/venture/*`, `/lab/*`) siguen operativas
- Dashboard estable (`/dashboard`) sin cambios

## Validación

- Lab: `/lab/os-rc2`
- `npm run build`
- `npm run reset:dev`

## Rutas OS

- `/os` — Home + Desktop + CEO Home
- `/os/ceo` — CEO Workspace
- `/os/portfolio` — Founder Dashboard
- `/os/creator` — Creator Flow
- `/os/workspace/[id]` — Venture Workspace
- `/os/build` — Build Platform hub
- `/os/knowledge` — Knowledge hub
- `/os/capital` · `/os/analytics` · `/os/calendar` — métricas founder
- `/os/marketplace` · `/os/settings` · `/os/labs`

---

**ForgeOS OS RC2 COMPLETADO**
