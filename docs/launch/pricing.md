# Pricing — ForgeOS 1.0

## Tiers (informativos en RC12)

| Plan | Precio | Target |
|------|--------|--------|
| Starter | €0/mes | Exploración y primera venture demo |
| Founder | €49/mes | Fundadores activos |
| Studio | €199/mes | Estudios y equipos |

## Notas RC12

- **Sin pagos reales** — todos los CTAs redirigen a `/beta`
- Límites de ventures son conceptuales; enforcement en release comercial
- Enterprise: contacto vía `/support`

## Implementación

Datos estáticos en `lib/launch/index.ts` → `PRICING_TIERS`.
UI en `components/launch/PricingPage.tsx`.
