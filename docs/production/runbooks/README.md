# Runbooks — Production

Operational runbooks for ForgeOS production (Program 6500).

## Index

1. [Incident Response](./incident-response/README.md)
2. [Backup](./backup/README.md)
3. [Recovery](./recovery/README.md)
4. [Deployment](./deployment/README.md)

## Quick reference

- **Kill switch**: Set `ENABLE_KILL_SWITCH=true` only in emergencies.
- **Health endpoint**: Configure `PRODUCTION_HEALTH_ENDPOINT` for external probes.
- **Dry-run**: `PRODUCTION_DRY_RUN=true` (default) blocks destructive operations.
