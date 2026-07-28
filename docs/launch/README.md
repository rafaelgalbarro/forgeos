# ForgeOS 1.0 Launch — Program 7000

Documentación del lanzamiento oficial ForgeOS 1.0. Extiende RC12 (Program 3000 Sprint 6) y Program 6000 (Commercial Readiness).

## Alcance Program 7000

- Superficies de producto, marketing y docs públicos
- Sin nuevos engines ni cambios en Runtime, Executive Mesh, AI Runtime o Skills
- Reutiliza pricing comercial, componentes launch y páginas legales

## Rutas públicas

| Ruta | Descripción |
|------|-------------|
| `/launch` | Hub central del lanzamiento 1.0 |
| `/landing` | Landing RC12 (enlazada desde launch) |
| `/pricing` | Planes Starter/Pro/Business/Enterprise |
| `/docs` | Portal de documentación pública |
| `/demo` | Demo interactiva y tour de producto |
| `/community` | Comunidad, contacto y legal hub |
| `/changelog` | Historial de versiones |
| `/status` | Estado del sistema |
| `/support` | Centro de soporte |

## Módulos

- `lib/forgeos-launch/` — datos agregados del launch (Program 7000)
- `lib/launch/` — RC12 beta, onboarding, changelog, roadmap
- `lib/commercial/` — pricing, legal, KB, API docs
- `components/launch/` — componentes FHIS de superficies públicas

## Variables de entorno

```env
FORGEOS_LAUNCH_MODE=true
NEXT_PUBLIC_LAUNCH_MODE=true
```

## Documentos

- [marketing.md](./marketing.md)
- [public-api.md](./public-api.md)
- [go-live-checklist.md](./go-live-checklist.md)
- [go-to-market.md](./go-to-market.md)
- [pricing.md](./pricing.md)
- [beta-plan.md](./beta-plan.md)
- [onboarding.md](./onboarding.md)
- [support.md](./support.md)
