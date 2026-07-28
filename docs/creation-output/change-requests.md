# Change Requests

Managed in `lib/creation-output/change-requests.ts`.

## Flow

1. User clicks "Solicitar cambios" in Studio
2. `createChangeRequest(output, description, affectedAreas)` runs
3. If output is `APPROVED`: new version created via `createNewVersion`
4. Previous version preserved
5. Decision registered in repository
6. Timeline updated via mission events (client-side state)

## ChangeRequest Fields

- `id`, `missionId`, `outputId`, `outputType`
- `description`, `affectedAreas`
- `status`: open | in_progress | resolved | cancelled
- `previousVersionId`, `newVersionId`

## Approval

`approveOutput(output)` sets status to `APPROVED` and appends approval record.
