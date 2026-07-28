# Productivity Skills (RC4.3)

Sandbox-only productivity provider modules for ForgeOS. No real API connections — all execution flows through Runtime + Skills Governance.

## Providers

| Module | Skill ID | Actions |
|--------|----------|---------|
| Email | `productivity-email` | send, read, draft, list_threads, archive |
| Calendar | `productivity-calendar` | list_events, create_event, update_event, check_availability, cancel_event |
| Files | `productivity-files` | upload, download, list, share, delete |
| Documents | `productivity-documents` | create, edit, collaborate, comment, export |
| Messaging (Slack) | `productivity-messaging` | list_channels, post_message, read_thread, reply_thread, search |
| Meetings | `productivity-meetings` | create, join, record, notes, end |
| Knowledge | `productivity-knowledge` | search, get_article, create_article, update_wiki, list_spaces |

## Structure

```
lib/skills/productivity/
  types.ts, registry.ts, executor.ts, index.ts
  email/, calendar/, files/, documents/, messaging/, meetings/, knowledge/
    types.ts, registry.ts, permissions.ts, policies.ts, risk.ts,
    rollback.ts, mock-executor.ts, sandbox.ts, adapter.ts, index.ts
```

Each provider implements: Registry, Permissions, Policies, Risk, Rollback, Telemetry metadata, Audit shape, Mock Execution, Sandbox (never production default).

## Execution

- `runSkillRequest` — routes productivity skills to provider mock executors
- `runGovernedSkillRequest` — full governance pipeline (risk, approval, policy, audit)

Adapters dispatch via `lib/skills/adapters/runtime-adapter.ts` only.

## Lab

`/lab/productivity-skills` — visualizes Inbox, Calendar, Files, Documents, Slack, Meetings, and History timeline.
