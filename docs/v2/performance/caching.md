# Caching Strategy

Three levels, no cross-venture mixing.

## 1. Request Cache

- Scope: single HTTP request
- TTL: 30s default
- Deduplication within request

## 2. Read Model Cache

- Scope: venture/workspace keyed
- TTL: 30-60s
- Invalidation: MissionSummaryChanged, VentureCardChanged, etc.
- Freshness: LIVE | STALE | MISSING

## 3. Artifact Cache

- Metadata only (never full file contents)
- Variants: thumbnail, card, preview, full URLs
- TTL: 5 minutes

## Keys

`scope:namespace:workspaceId:ventureId:missionId:version:id`

No caching of sensitive approvals without proper invalidation.
