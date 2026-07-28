# Design Partners — Acceso IA Real

## Quién califica

Design Partners son cuentas autorizadas para probar IA real antes del lanzamiento general. El acceso se controla por variables de entorno en el servidor — no por UI.

## Flags de Design Partner

```env
ENABLE_DESIGN_PARTNER_AI=true
# o
DESIGN_PARTNER_MODE=true
```

Con cualquiera de estos flags **y** `ENABLE_REAL_AI=true`, el runtime puede activar proveedores reales incluso si el partner aporta sus propias API keys.

## Sin flag de Design Partner

Si `ENABLE_REAL_AI=true` pero **no** hay flag de design partner, se requiere al menos una API key explícita:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY` (o `GOOGLE_AI_API_KEY`)
- `OPENROUTER_API_KEY`

Sin keys ni flag de partner → modo simulación (mock gateway).

## Verificación

1. Abrir `/ai`
2. Comprobar badges:
   - **Design Partner: sí**
   - **Modo: IA REAL** (con keys o flag)
3. Revisar salud de proveedores en el panel

## Seguridad

- Las API keys son **solo servidor** — nunca se exponen al cliente
- El panel `/ai` muestra estado de activación en solo lectura
- `ENABLE_REAL_AI=false` por defecto en todos los entornos de desarrollo

## Soporte

Para solicitar acceso Design Partner, contactar al equipo ForgeOS con el workspace ID activo.
