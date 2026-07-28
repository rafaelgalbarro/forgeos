# Governance

## Reglas inmutables

1. **ForgeOS nunca auto-modifica su propio código**
2. **Nunca auto-merge a main**
3. **Todas las propuestas requieren aprobación humana**
4. **Operaciones Git son dry-run** hasta token + approval flag

## Flujo ejecutivo (simulación)

| Etapa | Revisor |
|-------|---------|
| CEO | CEO Agent |
| Board | Board Simulator |
| Department Owners | Dept Owners Mesh |
| Risk Review | Risk Officer |
| Approval | Human Approver |

El estado se rastrea pero no ejecuta cambios reales.

## Approval Layer

Solo tras aprobación humana explícita:

1. Crear branch (simulado)
2. Implementar cambios (manual)
3. Tests
4. Review
5. Merge (humano únicamente)
