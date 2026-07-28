# ForgeOS RC1 — Known Limitations

## AI y generación

- **Mock AI por defecto:** Sin API keys, Forge Intelligence, Research y Product usan heurísticas/mock.
- **Sin LLM real en RC1:** El CEO Workspace usa `buildCeoWorkspaceDataHeuristic()` en cliente; la ruta async con AI puede fallar silenciosamente a heurística.
- **Founder Advisor:** Respuestas predefinidas en fixture VANDL, no conversación en tiempo real.

## Persistencia

- **localStorage only:** Ventures en `forgeos-ventures`; sin base de datos ni sync multi-dispositivo.
- **Build Context in-memory:** `context-store` se resetea al recargar; labs usan `persist: false`.
- **VANDL fixture:** Siempre disponible vía `resolveVandlVenture()` aunque no esté en localStorage.

## Deploy e infraestructura

- **Sin deploy real:** Release Manager genera checklists y artefactos simulados; no hay CI/CD ni cloud provisioning.
- **Infrastructure Factory:** Blueprints de referencia (Vercel, Supabase, etc.) sin aplicar cambios.
- **No hay URLs de producción** para ventures generados.

## Runtime

- **Workers simulados:** Task queue y execution engine son labs con datos mock.
- **Observability:** Telemetría en memoria, no conectada a Datadog/Sentry reales.

## UX / rutas

- **Dashboard 0.3.0 congelado:** `/dashboard` mantiene `DashboardView` sin migrar a CEO Workspace.
- **Dos UIs de venture:** Ventures `ready` legacy usan `VentureWorkspace`; VANDL y nuevos usan `VentureWorkspaceView`.
- **Venture page redirect:** Ventures en estado `intelligence` redirigen a `/intelligence/[id]` (excepto VANDL).

## Validación RC1

- **Validación sintáctica:** `rc1-validation-lab` verifica que cada paso produce output, no calidad del contenido.
- **Thresholds mínimos:** Build Context ≥ 40%, DNA ≥ 50% — umbrales bajos para pasar en RC1.
- **Factories:** Un error en cualquier factory falla el paso completo.

## Seguridad

- **Sin auth:** Todas las rutas son públicas en localhost.
- **Sin RBAC:** CEO/Board son simulaciones sin control de acceso.

## Browser

- **Client-only stores:** `getVentureById` retorna `[]` en SSR; páginas venture usan `useEffect` para hidratar.
