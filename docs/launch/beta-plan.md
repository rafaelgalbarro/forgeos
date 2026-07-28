# Beta Plan — ForgeOS 1.0

## Flujo obligatorio

```
/landing → /beta (signup) → /onboarding → /os → /venture-factory | /founder-journey
```

## Registro

- Formulario en `/beta` y embebido en `/landing`
- Almacenamiento: `localStorage` key `forgeos-beta-signup`
- Aprobación instantánea en RC12 (status: `approved`)

## Acceso

- Onboarding requiere `hasBetaAccess()` === true
- Sin beta registrada → redirect a `/beta`

## Qué incluye la beta

- Venture Factory (dry-run)
- Founder Journey
- Live AI Operations Center
- Feedback widget

## Qué NO incluye

- Emails de confirmación
- Pagos
- Deploy real a producción
- SSO / equipos

## Reset

```bash
npm run reset:dev
```

O limpiar localStorage del navegador.
