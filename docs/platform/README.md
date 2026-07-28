# ForgeOS Platform — Venture Operating System v1.0

Documentación del **Master Program**: arquitectura de pilares para el Venture Operating System de ForgeOS.

## Visión

ForgeOS Platform es una capa de orquestación **aislada** (`lib/platform/`) que modela el ciclo de vida de un venture en nueve pilares. No reemplaza los módulos existentes en `lib/*`; los conecta mediante **adaptadores** de solo lectura.

## Pilares

| ID | Nombre | Fase del venture |
|----|--------|------------------|
| `strategy` | Strategy | Discovery, research, simulación |
| `product` | Product | PRD, roadmap, UX |
| `build` | Build | Plan técnico, conectores dev |
| `launch` | Launch | GTM, branding, SEO |
| `growth` | Growth | CAC, LTV, funnels |
| `ceo` | CEO | Orquestación ejecutiva |
| `studio` | Studio | Portfolio, knowledge |
| `intelligence` | Intelligence | Memoria, patrones, decisiones |
| `capital` | Capital | Fundraising, data room |

## Índice de documentos

1. [01_strategy.md](./01_strategy.md)
2. [02_product.md](./02_product.md)
3. [03_build.md](./03_build.md)
4. [04_launch.md](./04_launch.md)
5. [05_growth.md](./05_growth.md)
6. [06_ceo.md](./06_ceo.md)
7. [07_studio.md](./07_studio.md)
8. [08_intelligence.md](./08_intelligence.md)
9. [09_capital.md](./09_capital.md)
10. [10_shared.md](./10_shared.md)
11. [11_platform_architecture.md](./11_platform_architecture.md)
12. [12_future_integrations.md](./12_future_integrations.md)
13. [13_master_roadmap.md](./13_master_roadmap.md)
14. [14_api_strategy.md](./14_api_strategy.md)
15. [15_scalability.md](./15_scalability.md)

## Reglas de dependencia

1. Los pilares **no se importan entre sí**.
2. Solo `shared/` y adaptadores hacia `lib/*` externos.
3. La plataforma **no está cableada** en rutas/páginas de la app.
4. Sin dependencias npm nuevas.
5. Sin dynamic imports.

## Estado actual

**v1.0 scaffold** — todos los pilares en `status: 'scaffold'`.
