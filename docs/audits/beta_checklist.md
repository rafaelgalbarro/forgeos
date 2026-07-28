# ForgeOS Beta Privada — Checklist

**Audit:** Master V1.0 · **Fecha:** 2026-07-07  
**Preparación actual:** ~48%

---

## Infraestructura

- [x] `npm run build` exit 0
- [x] `npm run reset:dev` funcional
- [x] Rutas core 200 (50/50 verificadas)
- [ ] Deploy staging remoto (Vercel/Railway)
- [ ] CI pipeline (build + lint)
- [ ] CI E2E Playwright
- [ ] `.next` cache strategy documentada
- [ ] Monitoring (Sentry/LogRocket)

---

## Auth & usuarios

- [ ] Registro / login real
- [ ] Verificación email
- [ ] Recuperación contraseña
- [ ] Sesiones seguras (httpOnly cookies)
- [ ] Logout
- [ ] Beta invite codes o waitlist admin
- [x] Beta signup UI (`/beta`) — localStorage only

---

## Producto — flujo feliz

- [x] Landing (`/landing`)
- [x] Pricing UI (`/pricing`) — sin pagos
- [x] Onboarding wizard (`/onboarding`)
- [ ] Onboarding → venture creado automáticamente
- [x] OS shell (`/os`)
- [x] Venture Factory demo
- [x] Organization briefing
- [x] Live AI demo
- [x] Capital heurístico
- [ ] Portfolio persiste ventures usuario
- [ ] Un solo entry point para fundador

---

## IA

- [x] Pipeline gobernado implementado
- [x] `ENABLE_REAL_AI=false` default
- [ ] Staging con 1 provider real documentado
- [ ] Cost caps enforced
- [ ] Fallback probado con keys inválidas

---

## Build & deploy

- [x] Real connections adapters
- [x] Approval layer
- [x] Dry-run default
- [ ] Preview deploy E2E en staging
- [ ] `ENABLE_REAL_BUILD_FLOW=true` solo staging

---

## Seguridad

- [x] Sin secrets en repo
- [x] Flags ejecución real off
- [ ] API routes protegidas
- [ ] Rate limiting
- [ ] CSP headers
- [ ] Secret scanning CI

---

## UX

- [x] FHIS en superficies nuevas
- [ ] Navegación unificada
- [ ] Labs ocultos para beta users
- [ ] Accessibility audit (axe)
- [ ] Mobile responsive audit

---

## Legal & compliance

- [x] Privacy placeholder (`/privacy`)
- [x] Security placeholder (`/security`)
- [ ] Terms of Service
- [ ] Cookie consent
- [ ] GDPR data export/delete

---

## GTM

- [x] Status page UI (`/status`)
- [x] Support center UI (`/support`)
- [x] Docs hub (`/docs`)
- [ ] Changelog público actualizado
- [ ] Roadmap público sincronizado
- [ ] Analytics conectado (PostHog/Plausible)

---

## Criterio GO / NO-GO Beta

| Criterio | Estado |
|----------|--------|
| Build verde | ✅ GO |
| Auth real | ❌ NO-GO |
| Flujo E2E sin 500 | ⚠️ PARCIAL |
| Deploy staging | ❌ NO-GO |
| 10 design partners identificados | ? (negocio) |

**Decisión audit:** **NO-GO** para beta abierta · **GO** para beta cerrada supervisada (demo sessions).

---

## Comandos verificación pre-beta

```powershell
npm run kill:ports
Remove-Item -Recurse -Force .next
npm run build
npm run reset:dev
# Verificar: /, /os, /landing, /onboarding, /venture-factory, /capital
```
