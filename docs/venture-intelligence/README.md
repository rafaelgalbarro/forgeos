# Venture Intelligence — RC8

Inteligencia financiera, estratégica e inversor para ForgeOS: valorar, financiar, escalar y preparar startups para inversión.

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/capital` | Dashboard principal de capital (fundador / demo) |
| `/investors` | Investor room y data room |
| `/lab/venture-intelligence` | Lab de motores heurísticos |
| `/lab/forge-capital` | Lab de departamentos AI de capital |
| `/os/capital` | Módulo OS existente (no modificado) |

## Modo dry-run

- **Sin ejecución real** — todos los motores son heurísticos
- Las estimaciones se etiquetan como `estimación heurística`
- Datos faltantes: `pendiente de datos reales`
- Con `ENABLE_REAL_AI=true`, los departamentos AI pueden usar AI Runtime

## Módulos

- `lib/venture-intelligence/` — motores de scoring, valoración, runway, riesgo, etc.
- `lib/forge-capital/` — composición y departamentos AI
- `components/venture-intelligence/` — UI FHIS

## Documentación

- [architecture.md](./architecture.md)
- [scoring.md](./scoring.md)
- [demo.md](./demo.md)
