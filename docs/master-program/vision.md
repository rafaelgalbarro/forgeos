# Visión — Master Program 2030

## Propósito

ForgeOS evoluciona de una colección de módulos en `lib/` hacia un **sistema operativo de ventures** con gobernanza explícita. El Master Program 2030 define esa gobernanza sin alterar el comportamiento actual de la aplicación.

## Visión

> Un founder o venture studio puede pasar de idea a producto construido, con decisiones trazables, inteligencia acumulada y ejecución técnica orquestada — todo bajo programas claros con ownership y métricas de entrega.

## Qué resuelve

1. **Ambigüedad de ownership** — cada módulo `lib/*` pertenece a un programa.
2. **Desalineación pilar-módulo** — mapeo explícito programa ↔ pilar ↔ módulo.
3. **Entrega sin estructura** — jerarquía Vision → Program → Epic → Feature → Release → Build.
4. **Deuda de scaffold** — CEO, Board, FOS, Capital marcados como desconectados/scaffold.

## Qué NO hace (v2030.0.0)

- No conecta FOS/CEO/Board a la UI
- No mueve código existente
- No añade rutas en `app/`
- No introduce APIs ni dependencias nuevas

## Horizonte

| Fase | Enfoque |
|------|---------|
| 2030.0 | Capa organizacional + docs + registries |
| 2030.1 | Épicas y features registradas por programa |
| 2030.2 | Delivery reports automatizados en CI |
| 2031+ | Wiring selectivo CEO/Build Engine según roadmap platform |

## Principios rectores

Ver [principles.md](./principles.md). Los tres pilares conceptuales:

- **Decision First** — toda feature nace de una decisión documentada
- **Founder Centric** — el founder es el usuario principal del OS
- **No Module Outside Programs** — gobernanza estricta de `lib/`
