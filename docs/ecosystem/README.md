# ForgeOS Ecosystem (RC9)

Plataforma extensible: marketplace, SDK, plugins, packs y creator economy.

**Modo sandbox únicamente** — sin instalaciones reales en runtime.

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/marketplace` | Marketplace RC4.8 + Ecosystem RC9 |
| `/store` | Skill Store RC4.8 + Ecosystem packs |
| `/plugins` | Catálogo de plugins sandbox |
| `/sdk` | Superficie SDK para desarrolladores |
| `/lab/ecosystem` | Lab con demo CRM |

## Demo obligatorio

1. Buscar `CRM` en Ecosystem Lab
2. Seleccionar **CRM Business Pack**
3. Ver dependencias (hubspot, email, business-billing, eco-plugin-crm-sync)
4. Simular instalación
5. Mensaje: **CEO ya puede utilizar esta capacidad**

## Módulos

- `lib/ecosystem/` — motores core
- `lib/marketplace/` — adapter marketplace
- `lib/sdk/` — adapter SDK
- `lib/plugins/` — adapter plugins

Ver [architecture.md](./architecture.md) y [creator-economy.md](./creator-economy.md).
