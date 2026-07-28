# Go-live checklist — ForgeOS 1.0

## Pre-launch

- [ ] `FORGEOS_LAUNCH_MODE=true` y `NEXT_PUBLIC_LAUNCH_MODE=true`
- [ ] `npm run build` exit 0
- [ ] Rutas públicas HTTP 200: `/launch`, `/pricing`, `/docs`, `/community`, `/demo`, `/changelog`, `/status`, `/support`
- [ ] `/landing` intacta y enlazada desde `/launch`
- [ ] Pricing final wired a Program 6000 plans

## Contenido

- [ ] Changelog incluye versión 1.0.0
- [ ] Legal hub con privacy y security ready
- [ ] Casos de éxito genéricos (VANDL) sin lógica hardcoded
- [ ] Newsletter y contacto en localStorage (stub)

## Comercial

- [ ] `COMMERCIAL_MODE=true`
- [ ] Stripe keys configuradas si billing real
- [ ] KB y soporte enlazan a launch hub

## Post-launch

- [ ] Monitorizar `/status`
- [ ] Recoger feedback via widget
- [ ] Activar video tutoriales (actualmente placeholders)

## Quality gates

```bash
npm run build
npm run reset:dev
# Verificar rutas en dev server
```
