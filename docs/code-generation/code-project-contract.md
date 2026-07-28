# Code Project Contract

PROGRAM 5360 defines `CodeProject` in `lib/code-generation/types.ts`.

## Core fields

| Field | Description |
|-------|-------------|
| `projectId` | Unique project identifier |
| `missionId` | Source mission |
| `projectType` | `website` \| `web_application` \| `mobile` \| `backend` \| `fullstack` |
| `files` | Array of `CodeFile` with full content |
| `validation` | Static validation result |
| `status` | Lifecycle status (DRAFT → READY_FOR_PREVIEW) |

## CodeFile

Each file includes: `path`, `language`, `content`, `purpose`, `generatedBy`, `checksum`, `editable`, `status`.

## Statuses

`DRAFT`, `GENERATING`, `GENERATED`, `VALIDATING`, `INVALID`, `READY_FOR_PREVIEW`, `CHANGES_REQUESTED`, `APPROVED`, `FAILED`
